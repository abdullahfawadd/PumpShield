import pathlib,json,html,collections,hashlib
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
rows=[]
for f in (root/'evidence').glob('*.json'):
    d=json.loads(f.read_text(encoding='utf-8'))
    if isinstance(d,dict):rows.extend(x for x in d.get('rows',[])if 'paths'in x)
unique={r['paths']['viewport']:r for r in rows};rows=list(unique.values());groups=collections.defaultdict(list)
for r in rows:groups[(r['role'],r['module'])].append(r)
bad=[];images=[]
for p in (root/'screenshots').rglob('*.png'):
    try:
        with Image.open(p)as im:
            im.load();images.append({'path':p.relative_to(root).as_posix(),'width':im.width,'height':im.height,'bytes':p.stat().st_size})
            thumb=im.convert('RGB');thumb.thumbnail((32,32))
            if min(im.size)<100 or len(set(thumb.getdata()))<10:bad.append(str(p))
    except Exception as e:bad.append(str(p)+str(e))
layout=[{'role':r['role'],'module':r['module'],'state':r['state'],'viewport':r['viewport'],'expected':int(r['viewport'].split('-')[1].split('x')[0]),'layoutWidth':r['geometry']['width'],'documentWidth':r['geometry']['documentWidth'],'visualWidth':r['geometry']['visualWidth']}for r in rows]
expanded=[x for x in layout if x['layoutWidth']>x['expected']+1 or x['documentWidth']>x['expected']+1]
checks=[]
for f in (root/'evidence').glob('quality-*.json'):checks+=json.loads(f.read_text())['checks']
violations=collections.defaultdict(dict)
for r in checks:
    for v in r['violations']:
        for n in v['nodes']:violations[v['id']][str(n['target'])]=n['summary']
summary={'screenshotStatesAtViewports':len(rows),'pngFiles':len(images),'modulesByRole':len(groups),'publicNormalScreens':len([g for g in groups if g[0]=='public']),'ownerNormalScreens':11,'munshiNormalScreens':7,'targetViewports':['1920x1080','1440x900','1366x768','430x932','390x844','360x800','320x640','768x1024'],'structuralImageFailures':bad,'expandedLayoutRows':len(expanded),'axeScreenViewportChecks':len(checks),'axeChecksWithViolations':sum(bool(r['violations'])for r in checks),'axeUniqueRules':list(violations),'uniqueSelectorFindings':{k:len(v)for k,v in violations.items()}}
(root/'evidence/audit-summary.json').write_text(json.dumps(summary,indent=2));(root/'evidence/screenshot-index.json').write_text(json.dumps(rows,indent=2),encoding='utf-8');(root/'evidence/screenshot-files.json').write_text(json.dumps(images,indent=2));(root/'evidence/layout-expansion.json').write_text(json.dumps(expanded,indent=2));(root/'evidence/accessibility-summary.json').write_text(json.dumps(dict(violations),indent=2))
parts=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PumpShield · Actual application audit gallery</title><style>body{font:15px/1.5 system-ui;margin:24px;background:#f5f3ee;color:#202724}main{max-width:1500px;margin:auto}h1{letter-spacing:-1px}a{color:#174c45}section{margin:24px 0;background:white;padding:20px;border:1px solid #cad1cb;border-radius:12px}img{max-width:100%;height:auto}table{width:100%;border-collapse:collapse;font-size:13px}td,th{text-align:left;padding:8px;border-bottom:1px solid #cad1cb}.scroll{overflow:auto}input{padding:12px;min-width:260px}small{display:block;color:#58645f}nav{display:flex;flex-wrap:wrap;gap:12px}summary{cursor:pointer;padding:10px}code{overflow-wrap:anywhere}</style><main><h1>PumpShield · Actual deployed application</h1><p>Captured 9 November 2026 from the live application using authenticated Owner/Munshi accounts in the labelled Design Lab. Synthetic records only. QR credentials and driver-link fields masked. These images are evidence, not generated concepts.</p><p><a href="design-exploration.html">Separate design exploration ↗</a> · <a href="01-executive-review.md">Executive review</a> · <a href="IMPLEMENTATION_MEGA_PROMPT.md">Implementation mega-prompt</a></p><p>'+html.escape(json.dumps(summary))+'</p><label>Find a module <input oninput="document.querySelectorAll(\'section\').forEach(e=>e.hidden=!e.dataset.name.includes(this.value.toLowerCase()))" placeholder="e.g. munshi parchi"></label><nav>']
for (role,module),rs in sorted(groups.items()):parts.append(f'<a href="#{role}-{module}">{role} / {module}</a>')
parts.append('</nav>')
for (role,module),rs in sorted(groups.items()):
    parts.append(f'<section id="{role}-{module}" data-name="{role} {module}"><h2>{role.title()} / {module}</h2><a href="contact-sheets/{role}-{module}.jpg"><img loading="lazy" src="contact-sheets/{role}-{module}.jpg" alt="{role} {module} comparison sheet"></a><small>Contact sheet compares representative desktop, mobile and tablet states. Open original images below for all eight sizes. Full-page captures retain real scroll geometry; scrolling dialogs also require their separate end-state images.</small><details><summary>All {len(rs)} captured state / viewport combinations</summary><div class="scroll"><table><tr><th>State</th><th>Viewport</th><th>Layout / visual width</th><th>Evidence</th></tr>')
    for r in rs:
        g=r['geometry'];parts.append(f'<tr><td>{r["state"]}</td><td>{r["viewport"]}</td><td>{g["width"]} / {g["visualWidth"]}</td><td><a href="{r["paths"]["viewport"]}">Viewport</a> · <a href="{r["paths"]["full"]}">Full page</a></td></tr>')
    parts.append('</table></div></details></section>')
parts.append('</main></html>');(root/'gallery.html').write_text(''.join(parts),encoding='utf-8');print(json.dumps(summary))
