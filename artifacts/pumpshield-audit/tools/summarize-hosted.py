import json,pathlib,re
p=pathlib.Path(__file__).resolve().parents[1]/'evidence'
def unwrap(name):
    d=json.loads((p/name).read_text(encoding='utf-8'));d=d.get('value',d)
    raw=d['content'][0]['text'];a=json.loads(raw)
    if isinstance(a.get('result'),str):
        s=a['result'];m=re.search(r'\n<untrusted-data-[^>]+>\s*(.*?)\s*</untrusted-data-',s,re.S);return json.loads(m.group(1))if m else a
    return a
functions=unwrap('hosted-functions.json');grants=unwrap('hosted-grants-rls.json');perf=unwrap('hosted-extra-0.json');sec=unwrap('hosted-0.json')
out={'functions':functions,'grantsAndRls':grants,'performanceNotices':perf,'securityNotices':sec}
(p/'hosted-summary.json').write_text(json.dumps(out,indent=2));print(json.dumps({'functions':[(r['schema'],r['function_name'])for r in functions],'perf':[(r['name'],r['count'])for r in perf['result']['lints']]}))
