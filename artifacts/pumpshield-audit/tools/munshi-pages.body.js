const d=await verifyLab('munshi');
await capture('munshi','home');
for(const [name,module] of [['Deliveries','deliveries'],['Shift reconciliation','shifts'],['Digital parchi','credit']]){await nav(name);await capture('munshi',module);}
await nav('Station operations');await page.getByRole('heading',{name:'Shift handovers',exact:true}).waitFor();
for(const [label,module] of [['Shift handovers','handovers'],['Fuel indents','indents'],['Maintenance','maintenance']]){await snapshot();await page.locator('.ops-tabs').getByRole('button',{name:label,exact:false}).click();await capture('munshi',module);}
return {rows,summary:{role:d.member.role,workspace:d.workspace,navigationScreens:7,viewports:ALL.length}};
