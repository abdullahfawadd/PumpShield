async page => {
  await page.getByRole('textbox', {name:'Email address',exact:true}).fill(__OWNER_EMAIL__);
  await page.getByRole('textbox', {name:'Password',exact:true}).fill(__OWNER_PASSWORD__);
  await page.getByRole('button', {name:'Sign in',exact:true}).click();
  await page.waitForURL('**/app');
  const response=await page.request.get('https://pumpshield-seven.vercel.app/api/dashboard');
  const data=await response.json();
  if(data.workspace!=='PumpShield - Design Lab' || data.member?.role!=='owner') throw new Error('Approved synthetic Owner workspace not verified');
  return {role:data.member.role,workspace:data.workspace,stationCount:data.stations.length,deliveryCount:data.deliveries.length,shiftCount:data.shifts.length,accountCount:data.accounts.length,buttons:await page.getByRole('button').allTextContents()};
}
