page.setDefaultTimeout(5000);await page.goto('https://pumpshield-seven.vercel.app/app');await verifyLab('owner');const checks=[];
await nav('Digital parchi');await page.getByRole('button',{name:'Add account',exact:true}).click();await capture('owner','credit','new-account',KEY);await closeDialog();
await page.getByRole('button',{name:'Manage vehicles',exact:true}).first().click();await page.getByRole('button',{name:'Add vehicle',exact:true}).click();await capture('owner','credit','add-vehicle',KEY);await closeDialog();
await page.getByRole('button',{name:'Manage vehicles',exact:true}).first().click();await page.getByRole('button',{name:'QR',exact:true}).first().click();await capture('owner','credit','qr-pass-masked',PAIR);await closeDialog();
await nav('Deliveries');const search=page.getByPlaceholder('Search vehicle or reference…');await search.fill('AUDIT-NO-MATCH-9835');await capture('owner','deliveries','search-empty',PAIR);await search.fill('');await page.locator('select[aria-label="Delivery stage"]').selectOption('submitted').catch(()=>{});
await nav('Documents');await page.getByPlaceholder('Search reference, vehicle, or account…').fill('AUDIT-NO-MATCH-9835');await capture('owner','documents','search-empty',PAIR);
await nav('Overview');await page.getByRole('switch',{name:'Hide financial amounts'}).check();await capture('owner','overview','privacy',PAIR);await page.getByRole('switch',{name:'Hide financial amounts'}).uncheck();
await page.setViewportSize({width:390,height:844});await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await page.getByRole('button',{name:'Open navigation',exact:true}).click();await capture('owner','shell','mobile-navigation',[ALL[4]]);
return {rows,checks};
