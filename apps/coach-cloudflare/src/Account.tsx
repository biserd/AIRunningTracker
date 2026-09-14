import React, {useEffect, useRef, useState} from "react";
async function account(action: string, body: unknown) {
  const response = await fetch("/api/account/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
  const data = await response.json() as {error?:string};
  if (!response.ok) throw new Error(data.error || "Sign-in failed. Please retry.");
}
export function AccountLogin() {
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const started=useRef(false);
  useEffect(()=>{
    if (started.current) return;
    started.current=true;
    const token=new URLSearchParams(location.hash.slice(1) || location.search).get("token");
    if (location.pathname!=="/auth/magic-link" || !token) return;
    history.replaceState(null,"","/preview");
    setBusy(true);setMessage("Signing you in…");
    account("verify",{token}).then(()=>location.replace("/preview"))
      .catch(e=>setMessage(e.message)).finally(()=>setBusy(false));
  },[]);
  async function submit(action:"login"|"email") {
    setBusy(true);setMessage("");
    try {
      await account(action,{email,...(action==="login"?{password}:{})});
      if(action==="login") location.replace("/preview");
      else setMessage("Check your inbox. If you have an account, your sign-in link is on its way.");
    } catch(e) {setMessage(e instanceof Error?e.message:"Please retry.");}
    finally {setBusy(false);}
  }
  return <section className="welcome">
    <span className="eyebrow">YOUR RUNS. YOUR COACH.</span>
    <h1>Welcome back.</h1><p>Use your existing AITracker account.</p>
    <form className="account-form" onSubmit={e=>{e.preventDefault();void submit("login");}}>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
      <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <button className="primary" disabled={busy || !email || !password}>Sign in</button>
      <button className="outline" type="button" disabled={busy || !email} onClick={()=>void submit("email")}>Email me a sign-in link</button>
    </form>
    <p className="footnote">Use an email link if you normally sign in with Strava. No new account or Strava connection needed.</p>
    {message && <p role="status">{message}</p>}
  </section>;
}
export async function signOut() {await account("logout",{});location.replace("/preview");}
