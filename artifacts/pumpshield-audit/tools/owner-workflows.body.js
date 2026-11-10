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
