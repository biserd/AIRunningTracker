import { DurableObject } from "cloudflare:workers";
import { AIError, instructions, openai } from "./openai";
import {voiceInstructions} from './coach-instructions';
import type {State} from '../shared/coach';
import {voiceDiagnostic, type VoiceStage} from './voice-diagnostics';

const VOICE_SESSION_SECONDS = 5 * 60;
const NON_RETRYABLE_PROVIDER_CODES = new Set([
  'credit_balance_exhausted',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded',
  'organization_usage_limit_exceeded',
]);

// One durable lease per browser session. The provider ID never comes from the client.
export class VoiceLease extends DurableObject<Env> {
  async start(sdp: string, state: State) {
    const diagnostic={stage:'lease_storage' as VoiceStage};
    try {
      return {ok:true as const,...await this.startSession(sdp,state,diagnostic)};
    } catch(error) {
      // RPC does not preserve custom Error prototypes. Return only safe fields.
      return {ok:false as const,status:error instanceof AIError ? error.status : 503,
        upstreamStatus:error instanceof AIError ? error.upstreamStatus : undefined,
        providerCode:error instanceof AIError ? error.providerCode : undefined,
        retryAfterMs:error instanceof AIError ? error.retryAfterMs : undefined,
        stage:diagnostic.stage,
        message:error instanceof AIError && error.status===409
          ? 'End your existing call before starting another.'
          : error instanceof AIError && NON_RETRYABLE_PROVIDER_CODES.has(error.providerCode || '')
            ? 'Voice needs an OpenAI billing or usage-limit update before it can connect.'
          : 'Voice could not connect. Please try again shortly.'};
    }
  }
  private async startSession(sdp: string, state: State, diagnostic:{stage:VoiceStage}) {
    const started = Date.now();
    let stage: VoiceStage = 'lease_storage';
    try {
    if (await this.ctx.storage.get("active"))
      throw new AIError("End your existing call before starting another.", 409);
    await this.ctx.storage.put("active", true);
    await this.ctx.storage.setAlarm(Date.now() + VOICE_SESSION_SECONDS * 1_000);
    } catch(error) {
      diagnostic.stage=stage;
      voiceDiagnostic(stage,started,error);
      throw error;
    }
    try {
      stage = 'provider_session';
      const body = {
          session: {
            model: "gpt-live-1",
            store: false,
            instructions: state.source==='production_account'?voiceInstructions(state):
              instructions.replace("This is a fictional sample runner, NOT the user's real training history. All supplied activity and plan data is SAMPLE DATA. Never imply Strava, weather, heart rate, recovery measurements or real accounts are connected.", "The client coach retrieves the authenticated runner's data. Use its returned source and freshness information. Never invent missing measurements.") +
              " You are the AI voice interface. Delegate all training questions and reminder requests to the client coach. Do not invent answers before a delegation result arrives. Speak briefly. Spoken agreement never confirms a reminder. Real training plan edits must be made on aitracker.run/training-plans.",
            delegation: { type: "client" },
            audio: { output: { voice: "marin" } },
            client: {
              data_channel: {
                allowed_client_events: [
                  "session.close",
                  "session.input_audio.mute",
                  "session.input_audio.unmute",
                  "session.commentary.append",
                ],
                allowed_server_events: "all",
              },
            },
          },
          transport: { type: "webrtc", sdp },
        };
      let result: { session?: { id?: string }; transport?: { sdp?: string } } | undefined;
      for (let attempt=0; attempt<2; attempt++) {
        try {
          result = (await openai(
            this.env.OPENAI_API_KEY,
            "live/sessions",
            body,
            AbortSignal.timeout(25_000),
          )) as typeof result;
          break;
        } catch(error) {
          const delay = error instanceof AIError ? error.retryAfterMs ?? 600 : 0;
          const transient = error instanceof AIError && error.upstreamStatus===429
            && !NON_RETRYABLE_PROVIDER_CODES.has(error.providerCode || '')
            && delay <= 2_500;
          if(attempt || !transient) throw error;
          await new Promise(resolve=>setTimeout(resolve,delay));
        }
      }
      stage = 'provider_response';
      if (!result?.session?.id || !result.transport?.sdp)
        throw new AIError("Voice could not connect.");
      await this.ctx.storage.put("providerId", result.session.id);
      // The provider's SDP is the readiness contract. Attaching a second control
      // socket here races the phone's WebRTC connection and closing that probe can
      // close an otherwise healthy session. Control is attached only when stopping.
      voiceDiagnostic('ready', started);
      return { sdp: result.transport.sdp, seconds: VOICE_SESSION_SECONDS };
    } catch (error) {
      diagnostic.stage=stage;
      voiceDiagnostic(stage, started, error);
      // A provider session may exist even if setup failed. Retry cleanup promptly;
      // do not leave the runner locked out for the full call duration.
      if (await this.ctx.storage.get("providerId")) {
        await this.ctx.storage.setAlarm(Date.now() + 15_000);
      } else {
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
      }
      throw new AIError(
        "Voice could not connect. Please try again shortly.",
        503,
        error instanceof AIError ? error.upstreamStatus : undefined,
        error instanceof AIError ? error.providerCode : undefined,
        error instanceof AIError ? error.retryAfterMs : undefined,
      );
    }
  }
  private async attach(id: string) {
    const response = await fetch(
      `https://api.openai.com/v1/live/sessions/${encodeURIComponent(id)}/attach`,
      {
        headers: {
          Upgrade: "websocket",
          Authorization: `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (response.status === 404 || response.status === 410) {
      await response.body?.cancel();
      return null;
    }
    if (!response.webSocket) {
      await response.body?.cancel();
      throw new AIError("Voice control unavailable", 503, response.status);
    }
    response.webSocket.accept();
    return response.webSocket;
  }
  async stop() {
    const id = await this.ctx.storage.get<string>("providerId");
    if (!id) {
      if (await this.ctx.storage.get("active"))
        throw new AIError(
          "Voice is still connecting. Try ending it again shortly.",
          409,
        );
      return { ok: true };
    }
    try {
      const socket = await this.attach(id);
      if (!socket) {
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
        return { ok: true };
      }
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          socket.close();
          reject(new Error("Voice finalization timed out"));
        }, 12_000);
        socket.addEventListener("message", (event) => {
          if (typeof event.data !== "string") return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === "session.closed") {
              clearTimeout(timer);
              socket.close(1000);
              resolve();
            }
          } catch {
            /* Ignore non-JSON events; never log audio or transcripts. */
          }
        });
        socket.addEventListener(
          "error",
          () => {
            clearTimeout(timer);
            reject(new Error("Voice control failed"));
          },
          { once: true },
        );
        socket.send(
          JSON.stringify({
            type: "session.close",
            event_id: crypto.randomUUID(),
          }),
        );
      });
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      return { ok: true };
    } catch {
      await this.ctx.storage.setAlarm(Date.now() + 30_000);
      throw new AIError(
        "Your microphone is off. The server is still finalizing the call.",
      );
    }
  }
  async alarm() {
    try {
      await this.stop();
    } catch {
      await this.ctx.storage.setAlarm(Date.now() + 30_000);
    }
  }
}
