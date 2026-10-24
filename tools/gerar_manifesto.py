#!/usr/bin/env python3
"""Gera manifesto SHA-256 de um artefato de release já existente.
Não altera o artefato. Guarde o artefato e o manifesto juntos em local seguro.
Uso: python tools/gerar_manifesto.py /caminho/atlas-release.zip
"""
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

def main():
    if len(sys.argv) != 2:
        raise SystemExit("Uso: python tools/gerar_manifesto.py ARQUIVO")
    path = Path(sys.argv[1]).expanduser().resolve()
    if not path.is_file():
        raise SystemExit("Arquivo inexistente: " + str(path))
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    info = {
        "projeto": "ATLAS UNIFORM STUDIO",
        "arquivo": path.name,
        "tamanho_bytes": path.stat().st_size,
        "sha256": digest.hexdigest(),
        "data_geracao_utc": datetime.now(timezone.utc).isoformat(),
        "observacao": "A data indica a geracao deste manifesto, nao a criacao original do software."
    }
    output = path.with_name(path.name + ".sha256.json")
    if output.exists():
        raise SystemExit("Manifesto ja existe; nao sera sobrescrito: " + str(output))
    output.write_text(json.dumps(info, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output)
    print("SHA-256:", info["sha256"])

if __name__ == "__main__":
    main()
