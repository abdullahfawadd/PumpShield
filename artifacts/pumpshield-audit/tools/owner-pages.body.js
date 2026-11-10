const d=await verifyLab('owner');
await capture('owner','overview');
for(const [name,module] of [['Deliveries','deliveries'],['Shift reconciliation','shifts'],['Digital parchi','credit'],['Documents','documents'],['Stock & prices','inventory']]){await nav(name);await capture('owner',module);}
await nav('Station operations');await page.getByRole('heading',{name:'Discrepancy cases',exact:true}).waitFor();
for(const [label,module] of [['Discrepancy cases','cases'],['Fuel indents','indents'],['Maintenance','maintenance'],['Shift handovers','handovers']]){await snapshot();await page.locator('.ops-tabs').getByRole('button',{name:label,exact:false}).click();await capture('owner',module);}
await desktop();await snapshot();await page.getByRole('button',{name:'Settings',exact:true}).click();await capture('owner','settings');
return {rows,summary:{role:d.member.role,workspace:d.workspace,navigationScreens:11,viewports:ALL.length}};
