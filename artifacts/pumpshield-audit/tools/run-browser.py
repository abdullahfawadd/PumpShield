"""Run an audit Playwright CLI stage without exposing temporary credentials.
Credentials remain in the approved ignored output file; private expanded scripts
are deleted immediately. Only sanitised results are printed or retained.
"""
import json, os, pathlib, re, subprocess, sys, tempfile
ROOT = pathlib.Path(__file__).resolve().parents[3]
session, filename = sys.argv[1:3]
code = pathlib.Path(filename).read_text(encoding="utf-8-sig")
credentials = json.loads((ROOT / "output/design-lab-credentials.json").read_text())
private = False
for role, entry in credentials.items():
    for key in ("email", "password"):
        marker = "__" + role.upper() + "_" + key.upper() + "__"
        if marker in code:
            private = True
            code = code.replace(marker, json.dumps(entry[key]))
tmp = None
try:
    if private:
        f = tempfile.NamedTemporaryFile(mode="w", suffix=".js", dir=ROOT / "output", delete=False, encoding="utf-8")
        f.write(code); f.close(); tmp = f.name
        source = tmp
    else:
        source = str(pathlib.Path(filename).resolve())
    cli = pathlib.Path(os.environ['LOCALAPPDATA']) / 'npm-cache/_npx/31e32ef8478fbf80/node_modules/@playwright/cli/playwright-cli.js'
    run = subprocess.run(["node", str(cli), "-s=" + session, "run-code", "--filename", source], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    output = re.sub(r"### Ran Playwright code\s*```[\s\S]*?```\s*", "", run.stdout)
    for entry in credentials.values():
        for key in ("email", "password"):
            output = output.replace(entry[key], "[redacted]")
    result_match = re.search(r"### Result\s*\n([^\n]+)", output)
    if len(sys.argv) > 3 and result_match:
        result = json.loads(result_match.group(1))
        pathlib.Path(sys.argv[3]).write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(json.dumps({"resultFile": sys.argv[3], "records": len(result) if isinstance(result,list) else list(result.keys())}))
    else:
        print(output)
    if run.stderr: print(run.stderr[:1000])
    if run.returncode or "### Error" in output: sys.exit(1)
finally:
    if tmp: pathlib.Path(tmp).unlink(missing_ok=True)
