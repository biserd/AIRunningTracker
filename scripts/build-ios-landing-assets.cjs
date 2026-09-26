// Optimize previously captured real native screens; never synthesize app UI.
const fs=require('node:fs'),path=require('node:path');
let sharp;try{sharp=require('sharp');}catch{sharp=require('C:/Users/biser/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');}
const repo=path.resolve(__dirname,'..'),source=path.join(repo,'output/app-store-20260926-v2/sources'),out=path.join(repo,'client/public/ios-app');
const shots={coach:'00-coach-iphone.png',plan:'00-plan-iphone.png',mileage:'02-mileage-iphone.png',calendar:'03-consistency-iphone.png',insights:'01-coaching-insights-iphone.png',ipad:'00-plan-ipad.png'};
(async()=>{
 fs.mkdirSync(out,{recursive:true});const manifest=[];
 for(const [name,file] of Object.entries(shots)){
  const output=path.join(out,name+'-v1.webp');await sharp(path.join(source,file)).autoOrient().resize({width:name==='ipad'?1440:600}).webp({quality:86,effort:6}).toFile(output);
  const m=await sharp(output).metadata();manifest.push({file:name+'-v1.webp',source:file,width:m.width,height:m.height,bytes:fs.statSync(output).size});
 }
 const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#ffffff"/><circle cx="1110" cy="490" r="340" fill="#FC4C02"/><circle cx="1120" cy="490" r="300" fill="none" stroke="#ffddbd"/><g font-family="Arial" fill="#333333"><text x="68" y="93" font-size="24" font-weight="700" fill="#c63b00">RUN ANALYTICS</text><text x="64" y="225" font-size="72" font-weight="700">Your running.</text><text x="64" y="308" font-size="72" font-weight="700">Your coach.</text><text x="64" y="391" font-size="72" font-weight="700" fill="#c63b00">Right here.</text><text x="68" y="490" font-size="25">Made for iPhone &amp; iPad</text><text x="68" y="537" font-size="22" fill="#64748b">Coming Soon</text></g></svg>`);
 const coach=await sharp(path.join(source,shots.coach)).resize({width:212}).png().toBuffer(),plan=await sharp(path.join(source,shots.plan)).resize({width:170}).png().toBuffer();
 await sharp(svg).composite([{input:plan,left:984,top:175},{input:coach,left:740,top:85}]).jpeg({quality:88}).toFile(path.join(out,'social-v1.jpg'));
 fs.writeFileSync(path.join(out,'screenshots.json'),JSON.stringify({source:'Real SwiftUI simulator captures with offline synthetic data; CI 36261950404 and 36249444929. No private runner data.',images:manifest},null,2));
 console.log(manifest);
})();
