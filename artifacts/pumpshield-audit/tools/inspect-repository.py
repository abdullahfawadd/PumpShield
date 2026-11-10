import hashlib, json, pathlib, re, subprocess, datetime
ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = ROOT / "artifacts/pumpshield-audit/evidence"
tracked = subprocess.check_output(["git", "ls-files"], cwd=ROOT, text=True).splitlines()
inventory=[]
for name in tracked:
    p=ROOT/name
    data=p.read_bytes()
    text=None
    try: text=data.decode("utf-8-sig")
    except UnicodeDecodeError: pass
    inventory.append({"path":name,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"lines":len(text.splitlines()) if text is not None else None})
routes=[]
for p in (ROOT/"src/app").rglob("*.tsx"):
    if p.name=="page.tsx": routes.append({"route":"/"+str(p.parent.relative_to(ROOT/"src/app")).replace("\\","/").replace(".",""),"kind":"page","source":str(p.relative_to(ROOT)).replace("\\","/")})
for p in (ROOT/"src/app").rglob("route.ts"):
    text=p.read_text()
    routes.append({"route":"/"+str(p.parent.relative_to(ROOT/"src/app")).replace("\\","/"),"kind":"handler","methods":re.findall(r"export async function (GET|POST|PUT|PATCH|DELETE|HEAD)",text),"source":str(p.relative_to(ROOT)).replace("\\","/")})
lock=json.loads((ROOT/"package-lock.json").read_text()); pkg=json.loads((ROOT/"package.json").read_text())
installed={k:json.loads((ROOT/"node_modules"/k/"package.json").read_text())["version"] for k in list(pkg["dependencies"])+list(pkg["devDependencies"])}
css=[]
for p in (ROOT/"src/app").glob("*.css"):
    text=p.read_text();css.append({"path":str(p.relative_to(ROOT)).replace("\\","/"),"lines":len(text.splitlines()),"bytes":len(text.encode()),"media":re.findall(r"@media\s*([^\{]+)",text),"variables":sorted(set(re.findall(r"--[a-zA-Z0-9-]+(?=\s*:)",text))),"hexColors":sorted(set(re.findall(r"#[a-fA-F0-9]{3,8}\b",text)))})
imports={}
for p in list((ROOT/"src").rglob("*.tsx"))+list((ROOT/"src").rglob("*.ts")):
    name=str(p.relative_to(ROOT)).replace("\\","/"); imports[name]=re.findall(r"(?:from\s+|import\s*\()[\"']([^\"']+)[\"']",p.read_text())
facts={"capturedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"commit":subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT,text=True).strip(),"routes":routes,"metadataRoutes":["/icon.svg","/favicon.ico","/manifest.webmanifest"],"installed":installed,"css":css,"sourceInventory":inventory,"imports":imports}
(OUT/"repository-inventory.json").write_text(json.dumps(facts,indent=2),encoding="utf-8")
print(json.dumps({"commit":facts["commit"],"trackedFiles":len(inventory),"routes":routes,"largestSources":sorted([r for r in inventory if r["lines"]],key=lambda r:r["lines"],reverse=True)[:9],"installed":installed},indent=2))
