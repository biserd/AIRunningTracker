interface Env {
  AI_GATEWAY_BASE?: string;
  RUNNER_COACH: DurableObjectNamespace<
    import("./runner-agent").RunnerCoachAgent
  >;
}
