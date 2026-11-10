async page=>{
const ROOT='D:/PumpShield/artifacts/pumpshield-audit';
const ALL=[{id:'desktop-1920x1080',width:1920,height:1080,mobile:false},{id:'desktop-1440x900',width:1440,height:900,mobile:false},{id:'desktop-1366x768',width:1366,height:768,mobile:false},{id:'mobile-430x932',width:430,height:932,mobile:true},{id:'mobile-390x844',width:390,height:844,mobile:true},{id:'mobile-360x800',width:360,height:800,mobile:true},{id:'mobile-320x640',width:320,height:640,mobile:true},{id:'tablet-768x1024',width:768,height:1024,mobile:true}];
const KEY=ALL.filter(v=>['desktop-1440x900','mobile-390x844','mobile-320x640'].includes(v.id));
const PAIR=ALL.filter(v=>['desktop-1440x900','mobile-390x844'].includes(v.id));
const rows=[];
let secrets=[];
const cdp=await page.context().newCDPSession(page);
const scrub=value=>String(value).replace(/\/gate\/[a-f0-9]{64}/g,'/gate/[redacted]').replace(/pumpshield:vehicle:[a-f0-9-]{36}/gi,'[vehicle credential redacted]').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email redacted]').split('\n').map(line=>{for(const secret of secrets)if(secret)line=line.split(secret).join('[credential redacted]');return line;}).join('\n');
async function desktop(){await page.setViewportSize({width:1440,height:900});await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:false});}
async function settle(){await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{})));});}
async function snapshot(){return scrub(await page.locator('body').ariaSnapshot());}
async function nav(name){await desktop();await snapshot();await page.locator('.sidebar nav').getByRole('button',{name,exact:false}).click();await settle();return snapshot();}
async function closeDialog(){const b=page.getByRole('button',{name:'Close dialog',exact:true});if(await b.count())await b.click();await settle();}
async function capture(role,module,state='normal',views=ALL){
  await settle();
  const stateSnapshot=await snapshot();
  for(const v of views){
    await page.setViewportSize({width:v.width,height:v.height});
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:v.width,height:v.height,deviceScaleFactor:v.mobile?2:1,mobile:v.mobile});
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:v.mobile,maxTouchPoints:v.mobile?5:1});
    await page.evaluate(()=>{scrollTo(0,0);document.querySelectorAll('.dialog-content').forEach(e=>e.scrollTop=0);});
    await settle();
    const data=await page.evaluate(()=>{
      const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
      const doc=document.documentElement;
      return {width:innerWidth,height:innerHeight,documentWidth:doc.scrollWidth,documentHeight:doc.scrollHeight,visualWidth:visualViewport?.width,touchPoints:navigator.maxTouchPoints,coarsePointer:matchMedia('(pointer:coarse)').matches,headings:[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>e.textContent.trim()),copy:[...document.querySelectorAll('h1,h2,h3,p,.eyebrow,.ops-footnote,label,.notice,.empty-state,.fine-print')].filter(visible).filter(e=>!e.closest('.qr-details')).map(e=>e.textContent.trim()).filter(Boolean),controls:[...document.querySelectorAll('input,select,textarea')].filter(visible).map(e=>({tag:e.tagName,type:e.type,name:e.name,label:e.labels?.[0]?.textContent.trim()||e.getAttribute('aria-label'),required:e.required,min:e.min,max:e.max,minLength:e.minLength,maxLength:e.maxLength,disabled:e.disabled})),smallTargets:[...document.querySelectorAll('button,a,input,select')].filter(visible).map(e=>({label:e.getAttribute('aria-label')||e.textContent.trim().slice(0,65),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})).filter(r=>r.width<24||r.height<24)};
    });
    const dir=`${ROOT}/screenshots/${role}/${module}/${v.id}`;
    const mask=page.locator('.qr-details canvas,.qr-details code,.tracking-share input');
    await page.screenshot({path:`${dir}/${state}-viewport.png`,scale:'css',mask:[mask]});
    await page.screenshot({path:`${dir}/${state}-full.png`,fullPage:true,scale:'css',mask:[mask]});
    rows.push({role,module,state,viewport:v.id,capturedAt:new Date().toISOString(),url:scrub(page.url()),paths:{viewport:`screenshots/${role}/${module}/${v.id}/${state}-viewport.png`,full:`screenshots/${role}/${module}/${v.id}/${state}-full.png`},geometry:{...data,copy:undefined,controls:undefined},copy:v.id===views[0].id?data.copy.map(scrub):undefined,controls:v.id===views[0].id?data.controls:undefined,snapshot:v.id===views[0].id?stateSnapshot:undefined,credentialMasking:'Vehicle QR/code and raw driver link fields masked; no credentials submitted during capture.'});
  }
  await desktop();
}
async function verifyLab(role){const response=await page.request.get('https://pumpshield-seven.vercel.app/api/dashboard');const d=await response.json();if(d.workspace!=='PumpShield - Design Lab'||d.member?.role!==role)throw new Error('Approved synthetic workspace/role not confirmed');secrets=(d.vehicles||[]).map(v=>v.token);return d;}


await verifyLab('owner');const outcomes=[];
async function modal(module,state,fn){try{await desktop();await closeDialog();await fn();await page.getByRole('dialog').waitFor();await capture('owner',module,state,KEY);const dialog=page.getByRole('dialog');const info=await dialog.evaluate(e=>({scroll:e.scrollHeight,client:e.clientHeight}));if(info.scroll>info.client+30){await dialog.evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:`${ROOT}/screenshots/owner/${module}/desktop-1440x900/${state}-dialog-end.png`,mask:[page.locator('.qr-details canvas,.qr-details code,.tracking-share input')]});}outcomes.push({module,state,status:'Opened; no state-changing submission'});await closeDialog();}catch(e){outcomes.push({module,state,status:'Unverified',error:scrub(e.message).slice(0,220)});await closeDialog().catch(()=>{});}}
await nav('Deliveries');
await modal('deliveries','create',()=>page.getByRole('button',{name:'New delivery',exact:true}).click());
await modal('deliveries','arrival-audit',()=>page.getByRole('button',{name:'Start arrival audit',exact:false}).first().click());
await modal('deliveries','approved-decant',()=>page.getByRole('button',{name:'Confirm decant',exact:false}).first().click());
await nav('Shift reconciliation');
await modal('shifts','close',()=>page.getByRole('button',{name:'Close shift',exact:true}).first().click());
await modal('shifts','review',()=>page.getByRole('button',{name:'Review',exact:true}).first().click());
await nav('Digital parchi');
await modal('credit','new-account',()=>page.getByRole('button',{name:'New account',exact:true}).click());
await modal('credit','manage-vehicles',()=>page.getByRole('button',{name:'Manage vehicles',exact:true}).first().click());
await modal('credit','payment',()=>page.getByRole('button',{name:'Payment',exact:true}).first().click());
await page.getByRole('button',{name:'Settings',exact:true}).click();
for(const [label,state] of [['Add station','new-station'],['Configure underground tanks','tank'],['Map your nozzles','nozzle'],['Record current fuel prices','price'],['Authorize Munshi','invite'],['Revoke access','revoke']])await modal('settings',state,()=>page.getByRole('button',{name:label,exact:!['Configure underground tanks','Map your nozzles','Record current fuel prices'].includes(label)}).first().click());
await modal('shell','help',()=>page.getByRole('button',{name:'Help & getting started',exact:true}).click());
await modal('shell','review-queue',()=>page.getByRole('button',{name:'1 pending reviews',exact:true}).click());
await nav('Station operations');
for(const [label,module] of [['Discrepancy cases','cases'],['Fuel indents','indents'],['Maintenance','maintenance'],['Shift handovers','handovers']]){await page.locator('.ops-tabs').getByRole('button',{name:label,exact:false}).click();await modal(module,'create',()=>page.getByRole('button',{name:/^New (case|indent|maintenance|handover)$/}).click());const cards=page.locator('.ops-card');if(await cards.count())await modal(module,'detail',()=>cards.first().click());}
return {rows,outcomes};

}