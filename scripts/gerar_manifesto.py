#!/usr/bin/env python3
"""Gera manifesto SHA-256 de arquivos locais para conferência de integridade.
O manifesto não constitui prova independente da data de criação ou titularidade.
"""
from pathlib import Path
import hashlib
import json
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
excluded = {".git", "node_modules", ".next", "dist", "build", "__pycache__", ".venv", "secrets"}
def eligible(p):
    parts = p.relative_to(root).parts
    if any(x in excluded for x in parts):
        return False
    if p.name == ".env" or p.name.startswith(".env.") or p.suffix in {".pem", ".key", ".p12", ".pfx"}:
        return False
    return p.is_file()
result = []
for p in sorted(root.rglob("*")):
    if eligible(p):
        digest = hashlib.sha256(p.read_bytes()).hexdigest()
        result.append({"caminho":p.relative_to(root).as_posix(),"sha256":digest,"bytes":p.stat().st_size})
print(json.dumps({"algoritmo":"SHA-256","arquivos":result},ensure_ascii=False,indent=2))
