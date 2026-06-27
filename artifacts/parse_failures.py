import json, zipfile, glob, re, sys, os

results_dir = sys.argv[1] if len(sys.argv) > 1 else 'artifacts'
fails = []
shard_summary = []
for z in sorted(glob.glob(os.path.join(results_dir, 'ios-results-*.zip')) + glob.glob(os.path.join(results_dir, 'android-results-*.zip'))):
    try:
        zf = zipfile.ZipFile(z)
    except Exception as e:
        print(f'!! cannot open {z}: {e}', file=sys.stderr); continue
    dj_name = next((n for n in zf.namelist() if n.endswith('-data.json')), None)
    if not dj_name:
        print(f'!! no *-data.json in {z}', file=sys.stderr); continue
    d = json.loads(zf.read(dj_name))
    platform = 'ios' if '/ios' in z or 'ios-results' in z else 'android'
    shard_summary.append((os.path.basename(z), platform, d.get('numTotalTests',0), d.get('numFailedTests',0), d.get('numPassedTests',0), d.get('numPendingTests',0)))
    for suite in d.get('testResults', []):
        for t in (suite.get('testResults') or []):
            if t.get('status') != 'failed':
                continue
            fm = (t.get('failureMessages') or [''])[0] or ''
            loc_match = re.findall(r'(\S+\.e2e\.ts:\d+:\d+)', fm)
            loc = loc_match[-1].split('/detox/e2e/')[-1] if loc_match else ''
            first = fm.split(chr(10))[0][:140]
            fails.append((platform, t.get('fullName',''), first, loc))

print(f'\n===== SHARD SUMMARY =====')
print(f'{"shard":35} {"plat":7} {"tot":>5} {"pass":>5} {"fail":>5} {"pend":>5}')
tot=fail=pass_=pend=0
for name,plat,t,f,ps,pn in shard_summary:
    print(f'{name:35} {plat:7} {t:5} {ps:5} {f:5} {pn:5}')
    tot+=t; fail+=f; pass_+=ps; pend+=pn
print(f'{"TOTAL":35} {"":7} {tot:5} {pass_:5} {fail:5} {pend:5}')

print(f'\n===== FAILURES ({len(fails)}) =====')
# group by file
from collections import defaultdict
byfile = defaultdict(list)
for plat,name,first,loc in fails:
    f = loc.split(':')[0] if loc else 'unknown'
    byfile[f].append((plat,name,first,loc))
for f in sorted(byfile):
    print(f'\n--- {f} ({len(byfile[f])}) ---')
    for plat,name,first,loc in byfile[f]:
        print(f'  [{plat}] {name}')
        print(f'        {first}')
        if loc: print(f'        @ {loc}')
