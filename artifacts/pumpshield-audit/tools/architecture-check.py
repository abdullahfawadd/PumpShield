import json,pathlib,hashlib,posixpath
root=pathlib.Path(__file__).resolve().parents[3];out=root/'artifacts/pumpshield-audit/evidence';d=json.loads((out/'repository-inventory.json').read_text());files={x['path']for x in d['sourceInventory']};graph={}
for path,imports in d['imports'].items():
    graph[path]=[]
    for imp in imports:
        stem='src/'+imp[2:]if imp.startswith('@/')else posixpath.normpath(posixpath.join(posixpath.dirname(path),imp))if imp.startswith('.')else None
        if stem:
            resolved=next((s for s in [stem,stem+'.ts',stem+'.tsx',stem+'/index.ts',stem+'/index.tsx']if s in files),None)
            if resolved:graph[path].append(resolved)
cycles=set()
def walk(n,chain):
    if n in chain:
        c=chain[chain.index(n):];cycles.add(tuple(sorted(c)));return
    if len(chain)>25:return
    for child in graph.get(n,[]):walk(child,chain+[n])
for n in graph:walk(n,[])
changes=[]
for x in d['sourceInventory']:
    p=root/x['path']
    if not p.exists()or hashlib.sha256(p.read_bytes()).hexdigest()!=x['sha256']:changes.append(x['path'])
result={'scope':'Static TypeScript imports resolved from initial tracked inventory. Dynamic imports/CommonJS not a complete cycle analysis.','cycles':[list(c)for c in cycles],'changedOriginalTrackedFiles':changes,'originalTrackedCount':len(files),'largestTextFiles':sorted([x for x in d['sourceInventory']if x.get('lines')],key=lambda x:x['lines'],reverse=True)[:12]}
(out/'architecture-check.json').write_text(json.dumps(result,indent=2));print(json.dumps(result)[:1400])
