page.setDefaultTimeout(4500);await verifyLab('munshi');const outcomes=[];
await nav('Digital parchi');await page.getByRole('button',{name:'New parchi',exact:true}).click();await capture('munshi','parchi','vehicle-pass',KEY);
await page.getByRole('textbox',{name:'Vehicle pass code',exact:true}).fill('not-a-vehicle-pass');await page.getByRole('button',{name:'Check vehicle',exact:true}).click();await capture('munshi','parchi','invalid-pass',PAIR);outcomes.push({flow:'Vehicle lookup',action:'Malformed pass',actual:await page.getByRole('alert').allTextContents(),serverMutation:false});
const scan=page.getByRole('button',{name:/Scan vehicle|Scan.*pass|Scan QR/});if(await scan.count()){await scan.first().click();await capture('munshi','parchi','scanner-permission',PAIR);}await closeDialog();
await nav('Deliveries');await page.getByRole('button',{name:'Start arrival audit',exact:false}).first().click();await capture('munshi','deliveries','arrival-audit',KEY);await closeDialog();
await nav('Shift reconciliation');await page.getByRole('button',{name:'Close shift',exact:true}).first().click();await capture('munshi','shifts','close',KEY);await closeDialog();
await nav('Station operations');await page.locator('.ops-tabs').getByRole('button',{name:'Maintenance',exact:false}).click();await page.getByRole('button',{name:'New maintenance',exact:true}).click();await capture('munshi','maintenance','create',PAIR);await closeDialog();
await page.goto('https://pumpshield-seven.vercel.app/offline');await capture('munshi','offline','prepare',ALL);
return {rows,outcomes};
