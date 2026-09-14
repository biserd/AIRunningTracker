import {createHash} from 'node:crypto';

export function consentHtml(rawRequest: string): string {
  const requestLiteral = JSON.stringify(rawRequest).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Authorize MCP access | RunAnalytics</title>
<style>body{margin:0;background:#f4f7fa;color:#102235;font:16px/1.55 system-ui,sans-serif}.card{max-width:680px;margin:7vh auto;background:#fff;border:1px solid #dbe4ec;border-radius:18px;padding:32px;box-shadow:0 18px 48px #1232}.brand{color:#fc4c02;font-weight:800}.scope{padding:12px 14px;background:#f7fafc;border-radius:10px;margin:9px 0}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:28px}button,a.button{border:0;border-radius:9px;padding:12px 18px;font-weight:700;cursor:pointer;text-decoration:none}.approve{background:#fc4c02;color:white}.deny{background:#e8edf2;color:#24384b}.fine{color:#607487;font-size:13px}.notice{margin-top:20px;padding:16px;border:1px solid #fed7aa;border-radius:12px;background:#fff7ed;color:#7c2d12}.error{color:#a61b1b}</style></head>
<body><main class="card"><div class="brand">RunAnalytics</div><h1>Authorize read-only access</h1><div id="content"><p>Loading authorization request…</p></div></main>
<script>
const requestId=${requestLiteral};
const esc=(v)=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){
 const token=localStorage.getItem('auth_token');
 if(!token){location.href='/auth?redirect='+encodeURIComponent(location.pathname+location.search);return;}
 const response=await fetch('/mcp/oauth/authorization-request?request='+encodeURIComponent(requestId),{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});
 if(response.status===401){localStorage.removeItem('auth_token');location.href='/auth?redirect='+encodeURIComponent(location.pathname+location.search);return;}
 const data=await response.json();
 if(!response.ok){document.getElementById('content').innerHTML='<p class="error">'+esc(data.error_description||'This authorization request is unavailable.')+'</p>';return;}
 const scopeHtml='<p><strong>'+esc(data.clientName)+'</strong> is requesting access to:</p>'+data.scopes.map(s=>'<div class="scope"><strong>'+esc(s.scope)+'</strong><br>'+esc(s.description)+'</div>').join('')+'<p class="fine">This connection cannot edit your account, sync Strava, trigger processing, send email, or change billing. Access expires after 15 minutes and refresh access can be revoked.</p>';
 if(!data.eligible){
   const returnTo='/mcp/consent?request='+encodeURIComponent(requestId);
   const upgrade='/pricing?source=mcp_consent&capability=mcp_access&benefitKey=mcp_access&returnTo='+encodeURIComponent(returnTo);
   document.getElementById('content').innerHTML=scopeHtml+'<div class="notice"><strong>Private MCP access is included with Premium.</strong><br>Start your 14-day trial, then return here to approve this connection. Card required; $0 today.</div><div class="actions"><a class="button approve" href="'+upgrade+'">Start 14-day free trial</a><button class="deny" id="deny">Deny</button></div>';
   bindActions();
   return;
 }
 document.getElementById('content').innerHTML=scopeHtml+'<div class="actions"><button class="approve" id="approve">Allow read-only access</button><button class="deny" id="deny">Deny</button></div>';
 bindActions();
}
function showError(){document.getElementById('content').innerHTML='<p class="error">Authorization could not be loaded. Return to your coach Settings and start a new connection.</p>';}
function bindActions(){
 for(const [id,approved] of [['approve',true],['deny',false]]){
  const button=document.getElementById(id);
  if(button)button.addEventListener('click',()=>{button.disabled=true;decide(approved).catch(showError);});
 }
}
async function decide(approved){
 const token=localStorage.getItem('auth_token');
 const response=await fetch('/mcp/oauth/authorize/decision',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({request:requestId,approved}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();
 if(response.ok&&data.redirectTo){location.href=data.redirectTo;return;}
 document.getElementById('content').innerHTML='<p class="error">'+esc(data.error_description||'Authorization could not be completed.')+'</p>';
}
load().catch(showError);
</script></body></html>`;
}

export function consentPage(request:string){
 const html=consentHtml(request);
 const script=html.match(/<script>([\s\S]*?)<\/script>/)![1];
 const hash=createHash('sha256').update(script).digest('base64');
 return {html,policy:`default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`};
}

