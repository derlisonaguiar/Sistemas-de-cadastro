import re
import json
from html import unescape
from pathlib import Path
from zipfile import ZipFile

ALLOWED_FIELDS = set(json.loads(Path(__file__).with_name("allowed_fields.json").read_text(encoding="utf-8")))

PLACEHOLDER_PATTERN = re.compile(r"\{\{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)\s*\}\}")

def extract_docx_xml(docx_path: Path) -> str:
    with ZipFile(docx_path, "r") as archive:
        names = [n for n in archive.namelist() if n.startswith("word/") and n.endswith(".xml") and
                 (n.endswith("document.xml") or "header" in n or "footer" in n)]
        return "\n".join(archive.read(name).decode("utf-8", errors="strict") for name in names)

def visible_text(xml_text: str) -> str:
    return unescape(re.sub(r"<[^>]+>", " ", xml_text)).replace("\u00a0", " ")

def validate_template_syntax(text: str) -> list[str]:
    if "{%" in text or "{#" in text or "%}" in text or "#}" in text:
        raise ValueError("FORBIDDEN_JINJA_BLOCK")
    fields = PLACEHOLDER_PATTERN.findall(text)
    remainder = PLACEHOLDER_PATTERN.sub("", text)
    if "{{" in remainder or "}}" in remainder:
        raise ValueError("FORBIDDEN_JINJA_EXPRESSION")
    unknown = sorted(set(fields) - ALLOWED_FIELDS)
    if unknown:
        raise ValueError("UNKNOWN_TEMPLATE_FIELD:" + ",".join(unknown))
    return sorted(set(fields))

LABEL_RULES = [
    (re.compile(r"\bnome(?:\s+completo)?\s*[:_]", re.I), "member.fullName", "Nome completo", 0.82),
    (re.compile(r"\bcpf\s*[:_]", re.I), "member.cpf", "CPF", 0.95),
    (re.compile(r"\brepresentante\s*[:_]", re.I), "representative.fullName", "Representante", 0.78),
    (re.compile(r"\be-?mail\s*[:_]", re.I), "member.email", "E-mail", 0.75),
    (re.compile(r"\btelefone\s*[:_]", re.I), "member.phone", "Telefone", 0.75),
    (re.compile(r"\bcnpj\s*[:_]", re.I), "organization.cnpj", "CNPJ", 0.75),
]

def detect_candidates(text: str) -> list[dict]:
    candidates = []
    for pattern, key, label, confidence in LABEL_RULES:
        for index, match in enumerate(pattern.finditer(text)):
            candidates.append({"key": f"candidate.{key}.{index}", "suggestedPath": key, "label": label,
                               "confidence": confidence, "context": text[max(0, match.start()-60):match.end()+100].strip()})
    return candidates
