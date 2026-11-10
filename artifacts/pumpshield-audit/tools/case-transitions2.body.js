page.setDefaultTimeout(6000);
const d=await verifyLab('owner');
if(d.workspace!=='PumpShield - Design Lab')throw Error('Lab required');
await closeDialog();await nav('Station operations');
await page.locator('.ops-tabs').getByRole('button',{name:'Discrepancy cases',exact:false}).click();
const title='AUDIT ONLY · Synthetic usability verification · 2026-11-09';
await page.locator('.ops-card').filter({hasText:title}).click();
await page.getByRole('dialog').waitFor();
await capture('owner','cases','before-transition',PAIR);
const outcomes=[];
for(const [status,note]of [['investigating','Synthetic audit only: checking workflow state and immutable history. No settlement or stock effects.'],['resolved','Synthetic usability verification complete. No discrepancy, financial adjustment, inventory change or client business record involved.']]){
 await page.getByRole('dialog').getByRole('combobox',{name:'Action',exact:true}).selectOption(status);
 await page.getByRole('dialog').getByRole('textbox',{name:'Decision / completion note',exact:true}).fill(note);
 const pending=page.waitForResponse(r=>r.url().endsWith('/api/operations')&&r.request().method()==='POST');
 await page.getByRole('button',{name:'Confirm action',exact:true}).click();
 const r=await pending;outcomes.push({status,http:r.status(),response:await r.json()});
 await settle();await capture('owner','cases','after-'+status,PAIR);
}
await closeDialog();return {rows,outcomes,title};
