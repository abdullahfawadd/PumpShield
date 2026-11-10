"""Run actual Postgres domain SQL on a disposable, unexposed test container.

Start a dedicated container first (never point this at production):
docker run --name pumpshield-redesign-validation --network none -e POSTGRES_HOST_AUTH_METHOD=trust -d postgres:17-alpine
python scripts/test-database.py

Auth/Storage table shapes are test fixtures, not running Supabase services.
The test DB is new for each run; production credentials are never required.
"""
import datetime,json,pathlib,re,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
container=sys.argv[1] if len(sys.argv)>1 else 'pumpshield-redesign-validation'
if not re.fullmatch(r'[a-zA-Z0-9_-]+',container):raise SystemExit('Invalid container name')
database='pumpshield_test_'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d_%H%M%S_%f')
created=subprocess.run(['docker','exec',container,'createdb','-U','postgres',database],capture_output=True,text=True)
if created.returncode:raise SystemExit(created.stderr)
files=[root/'tests/support/local-supabase.sql',*sorted((root/'supabase/migrations').glob('*.sql')),*[root/'tests'/f for f in ['database.sql','operations.sql','field.sql','security-boundaries.sql','high-octane.sql']]]
results=[]
for file in files:
 transaction=['--single-transaction'] if file.parent.name=='migrations' else []
 result=subprocess.run(['docker','exec','-i',container,'psql','-U','postgres','-d',database,'-v','ON_ERROR_STOP=1',*transaction],input=file.read_text(encoding='utf-8'),text=True,capture_output=True,encoding='utf-8')
 results.append({'file':str(file.relative_to(root)),'passed':result.returncode==0,'output':result.stdout[-1500:],'error':result.stderr[-2000:]})
 print(file.name, 'PASS' if not result.returncode else 'FAIL')
 if result.returncode:print(result.stderr);break
out=root/'output/domain-sql-results.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps({'container':container,'database':database,'scope':'Real Postgres with fixture Auth/Storage schema; no hosted services or production writes.','results':results},indent=2),encoding='utf-8')
if any(not r['passed']for r in results):raise SystemExit(1)
