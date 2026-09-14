import {test} from "node:test";
import assert from "node:assert/strict";
const base=process.env.TEST_BASE_URL;
// Explicit opt-in: probes a deployed/local Worker without credentials.
test("real-account API rejects anonymous and legacy preview access", {skip:!base}, async()=>{
  for(const path of ["state","ai/status","reminders","whatsapp"]){
    const response=await fetch(base+"/api/"+path,{headers:{Cookie:"coach_preview="+"a".repeat(64)}});
    assert.equal(response.status,401,path);
    assert.equal(response.headers.get("Cache-Control"),"no-store");
    await response.body?.cancel();
  }
  const anonymous=await fetch(base+"/api/session",{method:"POST",headers:{Origin:base!,"Content-Type":"application/json"},body:"{}"});
  assert.equal(anonymous.status,401);
  const csrf=await fetch(base+"/api/account/logout",{method:"POST",headers:{Origin:"https://evil.test","Content-Type":"application/json"},body:"{}"});
  assert.equal(csrf.status,403);
});
