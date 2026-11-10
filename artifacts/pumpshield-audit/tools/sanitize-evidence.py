import pathlib,json
p=pathlib.Path(__file__).resolve().parents[1]/'evidence'
f=p/'keyboard.json';d=json.loads(f.read_text(encoding='utf-8'));d['keyboard']['focusRestored']='Document/body text observed; removed to avoid retaining serialized application payload. Separate focused test required.';f.write_text(json.dumps(d,indent=2),encoding='utf-8')
f=p/'document-responses.json';d=json.loads(f.read_text(encoding='utf-8'))
for r in d:r.pop('pdf',None)
f.write_text(json.dumps(d,indent=2),encoding='utf-8')
print('Removed redundant PDF payloads and unbounded focus text from audit evidence.')
