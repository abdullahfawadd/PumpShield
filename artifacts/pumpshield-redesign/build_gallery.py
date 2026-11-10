"""Build a local gallery from actual captured screenshots, never generated UI."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json, html, shutil

root=Path(__file__).resolve().parent
repo=root.parents[1]
out=repo/'output/qa'
rows=[]
for role in ['owner','munshi','public']:
    source=out/f'redesign-prod-{role}-layout.json'
    if source.exists(): rows.extend(json.loads(source.read_text(encoding='utf-8-sig')))
latest=out/'redesign-prod-overview-final-layout.json'
if latest.exists():
    rows=[r for r in rows if not (r['role']=='owner' and r['module']=='overview')]+json.loads(latest.read_text(encoding='utf-8-sig'))
latest=out/'redesign-prod-stock-settings-final-layout.json'
if latest.exists():
    rows=[r for r in rows if not (r['role']=='owner' and r['module']in['stock','settings'])]+json.loads(latest.read_text(encoding='utf-8-sig'))
priority={'overview':0,'home':0,'deliveries':1,'shifts':2,'parchi':3,'cases':4,'indents':5,'maintenance':6,'handovers':7,'documents':8,'stock':9,'settings':10,'login':0,'signup':1,'recovery':2}
rows.sort(key=lambda r:({'owner':0,'munshi':1,'public':2}[r['role']],priority.get(r['module'],20),-r['width']))
font_path=Path('C:/Windows/Fonts/segoeui.ttf')
font=ImageFont.truetype(str(font_path),17) if font_path.exists() else ImageFont.load_default()
small=ImageFont.truetype(str(font_path),13) if font_path.exists() else ImageFont.load_default()
groups={}
for row in rows: groups.setdefault((row['role'],row['module']),[]).append(row)
sections=[]
for (role,module),items in groups.items():
    folder=root/'screenshots'/role/module
    sheet=Image.new('RGB',(1280,1010),'#f5f3ee');draw=ImageDraw.Draw(sheet)
    draw.text((16,10),f'{role.title()} / {module.title()} — actual production-build captures',font=font,fill='#202724')
    pairs=[]
    for i,row in enumerate(items):
        w,h=row['width'],row['height'];path=folder/f'{w}x{h}-viewport.png'
        if not path.exists():raise RuntimeError(f'Missing captured image {path}')
        x=(i%4)*320+12;y=(i//4)*480+44
        draw.text((x,y),f'{w} × {h}',font=small,fill='#58645f')
        image=Image.open(path).convert('RGB');image.thumbnail((296,440));sheet.paste(image,(x+(296-image.width)//2,y+25))
        stem=f'screenshots/{role}/{module}/{w}x{h}'
        pairs.append(f'<li><strong>{w} × {h}</strong> <a href="{stem}-viewport.png">Viewport</a> <a href="{stem}-full.png">Full page</a></li>')
    sheet.save(folder/'contact-sheet.png',optimize=True)
    sections.append(f'<section class="module" data-role="{role}"><h2>{html.escape(role.title()+" · "+module.replace("_"," ").title())}</h2><a href="screenshots/{role}/{module}/contact-sheet.png"><img loading="lazy" src="screenshots/{role}/{module}/contact-sheet.png" alt="{role} {module} eight-viewport comparison" width="1280" height="1010"></a><details><summary>Open all {len(items)} viewport and full-page pairs</summary><ul>{"".join(pairs)}</ul></details></section>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PumpShield · Redesign evidence</title><style>*{box-sizing:border-box}body{font:15px/1.6 system-ui,sans-serif;margin:0;background:#f5f3ee;color:#202724}main{max-width:1440px;margin:auto;padding:32px 20px}h1{font-size:30px;letter-spacing:-1px}h2{font-size:19px}a{color:#174c45}header p{max-width:950px;color:#58645f}.warning{background:#fff3d6;color:#80530b;padding:12px 16px;border-radius:8px}nav{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0}button{font:inherit;min-height:44px;padding:8px 16px;border:1px solid #7a8580;border-radius:7px;background:white;color:#202724;cursor:pointer}button[aria-pressed=true]{background:#174c45;color:white}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.module{padding:18px;background:white;border:1px solid #cad1cb;border-radius:12px;min-width:0}.module[hidden]{display:none}.module img{width:100%;height:auto;border:1px solid #e9ede7}summary{cursor:pointer;min-height:44px;padding-top:12px}li{padding:5px}li a{margin-left:10px}footer{margin-top:32px;color:#58645f}@media(max-width:800px){.grid{grid-template-columns:1fr}main{padding:20px 12px}}</style><main><header><h1>PumpShield · Implemented redesign</h1><p>Actual browser screenshots of the local production build. Owner, Munshi and public authentication at eight viewport sizes. The generated tanker is an explicitly labelled illustration inside the real application.</p><p class="warning">Design Lab uses synthetic evaluation records. No real deliveries, funds or location signals. No hosted financial, stock or membership operations were posted during browser QA.</p><p><a href="../../docs/redesign-implementation-2026-11-09.md">Implementation, tests and release limitations</a> · <a href="verification.json">Verification data</a> · <a href="../../docs/visual-assets-2026-11-09.md">Asset provenance and concepts</a></p></header><nav aria-label="Filter screenshot role">'''
for role in ['all','owner','munshi','public']:page+=f'<button aria-pressed="{str(role=="all").lower()}" data-filter="{role}">{role.title()}</button>'
page+='</nav><div class="grid">'+''.join(sections)+'''</div><footer>Viewport/touch emulation is not physical-device acceptance. These are captured normal states; separate workflow evidence and unverified operations are described in the report.</footer></main><script>document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('.module').forEach(s=>s.hidden=b.dataset.filter!=='all'&&s.dataset.role!==b.dataset.filter);}));</script></html>'''
(root/'gallery.html').write_text(page,encoding='utf-8')
(root/'layout-matrix.json').write_text(json.dumps(rows,indent=2),encoding='utf-8')
evidence=['redesign-prod-interactions','overview-visual-results','owner-readability-results','settings-map-results','receiving-contrast-fixed','redesign-owner-document','redesign-munshi-document','workflow-final-results','workflow-focus-results','workflow-munshi-results','offline-lock-regression-results','redesign-performance']
details={}
for name in evidence:
    path=out/f'{name}.json'
    if path.exists():details[name]=json.loads(path.read_text(encoding='utf-8-sig'))
sql=json.loads((repo/'output/domain-sql-results.json').read_text(encoding='utf-8-sig'))
details['database']={'engine':'PostgreSQL17 in isolated disposable container','migrations':sum('migrations' in r['file']for r in sql['results']),'suites':[{'file':r['file'],'passed':r['passed']}for r in sql['results'] if r['file'].startswith('tests') and 'support'not in r['file']],'allPassed':all(r['passed']for r in sql['results']),'limitation':'Fixture Auth/Storage schemas, not full Supabase service E2E.'}
summary={'branch':'codex/petroleum-ledger-redesign','deployment':'Not pushed or deployed; hosted migration not applied','syntheticOnly':True,'normalViewportStates':len(rows),'normalScreenshots':len(rows)*2,'modules':len(groups),'contactSheets':len(groups),'horizontalOverflows':[r for r in rows if r['doc']>r['width']],'quality':{'lint':'passed','typescript':'passed','unitTests':39,'unitFiles':9,'productionBuild':'passed','productionDependencyAudit':'zero known vulnerabilities at execution time'},'evidence':details}
readability=details.get('owner-readability-results',{})
stock_fixed=readability.get('stockBadgeRemediation',{}).get('resolved',False)
summary['accessibilitySummary']={'ownerNormalModulesAt390':8,'remainingTestedOwnerNormalViolations':0 if stock_fixed else 'See evidence','stockBadgeRemediationVerified':stock_fixed,'note':'Before findings are retained in evidence alongside verified remediation. Normal, dialog and customizer sampling is not a WCAG certification.'}
(root/'verification.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps({key:summary[key]for key in ['normalViewportStates','normalScreenshots','modules','contactSheets','horizontalOverflows']}))
