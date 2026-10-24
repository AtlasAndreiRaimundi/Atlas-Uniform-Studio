#!/usr/bin/env python3
"""A bounded secret-pattern gate, not a complete security certification."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
rules = {
    'private-key': r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
    'github-token': r'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}',
    'aws-key': r'AKIA[A-Z0-9]{16}',
    'openai-key': r'sk-(?:proj-)?[A-Za-z0-9_-]{32,}',
    'jwt': r'eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}',
    'credential-url': r'https?://[^/\s:@]+:[^/\s@]+@',
    'assigned-secret': r'''(?i)(?:password|secret|api_key|access_token)\s*[:=]\s*["'][^"'\s]{12,}["']''',
}
findings = []
for path in sorted((ROOT / 'source').rglob('*')):
    if not path.is_file():
        continue
    rel = path.relative_to(ROOT).as_posix()
    if path.name.startswith(('.env', '.dev.vars')) or path.suffix in {'.pem', '.key', '.p12', '.sqlite', '.sqlite3'}:
        findings.append(rel + ': prohibited local secret/data file')
    try:
        text = path.read_text()
    except UnicodeError:
        continue
    for name, pattern in rules.items():
        for match in re.finditer(pattern, text):
            findings.append(f'{rel}:{text.count(chr(10), 0, match.start()) + 1}: {name}')
if findings:
    raise SystemExit('\n'.join(findings))
print('Secret-pattern scan passed; values are never printed')
