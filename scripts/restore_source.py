#!/usr/bin/env python3
"""Restore losslessly packed assets; verify every exported byte before use."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'source-manifest.json').read_text())
for item in manifest['files']:
    target = ROOT / 'source' / item['path']
    if not target.is_file():
        packed = ROOT / 'import-assets' / (item['path'] + '.gz')
        if not packed.is_file():
            raise SystemExit('Missing: ' + item['path'])
        data = gzip.decompress(packed.read_bytes())
        if hashlib.sha256(data).hexdigest() != item['sha256']:
            raise SystemExit('Packed hash mismatch: ' + item['path'])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    if hashlib.sha256(target.read_bytes()).hexdigest() != item['sha256']:
        raise SystemExit('Source hash mismatch: ' + item['path'])
print('Verified', len(manifest['files']), 'source files')
