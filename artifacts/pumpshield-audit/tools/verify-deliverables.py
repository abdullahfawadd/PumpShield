import pathlib,json,re,hashlib
from urllib.parse import unquote
root=pathlib.Path(__file__).resolve().parents[1];repo=root.parents[1]
names=['01-executive-review.md','02-route-and-workflow-matrix.md','03-visual-audit.md','04-competitive-research.md','05-design-directions-and-colors.md','06-component-inventory.md','07-architecture-and-security.md','08-testing-and-verification.md','IMPLEMENTATION_MEGA_PROMPT.md','design-exploration.html','gallery.html']
missing=[n for n in names if not(root/n).exists()];links=[]
for n in names:
    if not n.endswith('.md'):continue
    text=(root/n).read_text(encoding='utf-8')
    for u in re.findall(r'\]\(<?([^\)\n>]+)>?\)',text):
        if u.startswith(('https:','http:','#')):continue
        p=pathlib.Path(unquote(u.split('#')[0]))
        if not p.is_absolute():p=root/p
        if not p.exists():links.append({'source':n,'target':u})
data=json.loads((root/'evidence/repository-inventory.json').read_text())
changes=[f['path']for f in data['sourceInventory']if not(repo/f['path']).exists()or hashlib.sha256((repo/f['path']).read_bytes()).hexdigest()!=f['sha256']]
# Compare known actual vehicle credentials locally; never print their values.
credentials=json.loads((repo/'output/design-lab-credentials.json').read_text());needles=[r[k]for r in credentials.values()for k in ['email','password']]
leaks=[]
for f in root.rglob('*'):
    if f.suffix in ['.json','.md','.html','.js','.py','.log']:
        text=f.read_text(encoding='utf-8',errors='replace')
        if any(x in text for x in needles):leaks.append(f.relative_to(root).as_posix())
result={'requiredFiles':len(names),'missingFiles':missing,'brokenLocalMarkdownLinks':links,'originalSourceChanges':changes,'knownTemporaryCredentialLeaks':leaks,'wordCounts':{n:len((root/n).read_text(encoding='utf-8').split())for n in names if n.endswith('.md')}}
(root/'evidence/deliverable-verification.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
