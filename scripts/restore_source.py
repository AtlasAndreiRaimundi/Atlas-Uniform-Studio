#!/usr/bin/env python3
"""Restore losslessly packed assets; verify every exported byte before use."""
import gzip
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'source-manifest.json').read_text())
remote_path = ROOT / 'presentation-pack-remote-assets.json'
remote = json.loads(remote_path.read_text()) if remote_path.exists() else {}
for item in manifest['files']:
    target = ROOT / 'source' / item['path']
    if not target.is_file():
        packed = ROOT / 'import-assets' / (item['path'] + '.gz')
        if not packed.is_file():
            spec = remote.get(item['path'])
            if not spec or spec['sha256'] != item['sha256'] or not spec['url'].startswith('https://uniforme-studio-andrei.andreiraimundi.chatgpt.site/assets/molds/pack26-'):
                raise SystemExit('Missing: ' + item['path'])
            with urllib.request.urlopen(spec['url'], timeout=60) as response:
                data = response.read()
            if hashlib.sha256(data).hexdigest() != item['sha256']:
                raise SystemExit('Remote hash mismatch: ' + item['path'])
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            continue
        data = gzip.decompress(packed.read_bytes())
        if hashlib.sha256(data).hexdigest() != item['sha256']:
            raise SystemExit('Packed hash mismatch: ' + item['path'])
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    if hashlib.sha256(target.read_bytes()).hexdigest() != item['sha256']:
        raise SystemExit('Source hash mismatch: ' + item['path'])
print('Verified', len(manifest['files']), 'source files')
