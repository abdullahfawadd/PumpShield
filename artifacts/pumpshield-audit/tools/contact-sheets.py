import pathlib,json,math
from PIL import Image,ImageOps,ImageDraw
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'contact-sheets';out.mkdir(exist_ok=True)
allrows=[]
for f in (root/'evidence').glob('*.json'):
    data=json.loads(f.read_text())
    if isinstance(data,dict):allrows+=[r for r in data.get('rows',[])if 'role'in r and 'paths'in r]
groups={}
for r in allrows:groups.setdefault((r['role'],r['module']),[]).append(r)
for (role,module),rows in groups.items():
    chosen=[r for r in rows if r['viewport'] in ['desktop-1440x900','mobile-390x844','mobile-320x640','tablet-768x1024']]
    sheet=Image.new('RGB',(1320,360*math.ceil(len(chosen)/4)), '#e9e8e4');d=ImageDraw.Draw(sheet)
    for i,r in enumerate(chosen):
        im=Image.open(root/r['paths']['viewport']).convert('RGB'); im.thumbnail((320,320))
        x=(i%4)*330;y=(i//4)*360
        sheet.paste(im,(x+(320-im.width)//2,y+25));d.text((x+4,y+4),r['viewport']+' '+r['state'],fill='#161616')
    sheet.save(out/f'{role}-{module}.jpg',quality=88)
print(json.dumps({'modules':len(groups),'rows':len(allrows),'sheets':len(list(out.glob('*.jpg')))}))
