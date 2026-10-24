#!/usr/bin/env python3
"""Import a fresh authorized Sites checkout, never credentials or Git history."""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if len(sys.argv) != 2:
    raise SystemExit('Usage: python3 scripts/sync_source.py /authorized/sites/checkout')
checkout = Path(sys.argv[1]).resolve()
sha = subprocess.check_output(['git', '-C', str(checkout), 'rev-parse', 'HEAD'], text=True).strip()
hosting = json.loads(subprocess.check_output(['git', '-C', str(checkout), 'show', sha + ':.openai/hosting.json']))
if hosting['project_id'] != 'appgprj_6ad921f302148191932d8c1e12374ce3':
    raise SystemExit('Wrong Sites project')
names = subprocess.check_output(['git', '-C', str(checkout), 'ls-tree', '-r', '--name-only', '-z', sha]).decode().split('\0')[:-1]
with tempfile.TemporaryDirectory() as temp:
    stage = Path(temp)
    (stage / 'scripts').mkdir()
    shutil.copy2(ROOT / 'scripts/check_source.py', stage / 'scripts/check_source.py')
    files = []
    for name in names:
        path = Path(name)
        if path.is_absolute() or '..' in path.parts:
            raise SystemExit('Unsafe source path')
        data = subprocess.check_output(['git', '-C', str(checkout), 'show', sha + ':' + name])
        target = stage / 'source' / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        files.append({'path': name, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
    subprocess.run([sys.executable, str(stage / 'scripts/check_source.py')], check=True)
    # Scan completes before replacing the previous snapshot. Git preserves deletions.
    if (ROOT / 'source').exists():
        shutil.rmtree(ROOT / 'source')
    shutil.copytree(stage / 'source', ROOT / 'source')
manifest = {'project_id': hosting['project_id'], 'source_commit': sha, 'exported_at': datetime.now(timezone.utc).isoformat(), 'files': files}
(ROOT / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('Imported', len(files), 'files from', sha)
print('Review git diff, run checks, update CHANGELOG, commit and push without force.')
