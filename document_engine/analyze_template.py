import argparse
import json
from pathlib import Path
from template_security import extract_docx_xml, visible_text, validate_template_syntax, detect_candidates

def analyze_template(template_path: str) -> dict:
    template = Path(template_path)
    if not template.exists() or template.suffix.lower() != ".docx":
        raise ValueError("INVALID_DOCX")
    xml = extract_docx_xml(template)
    fields = validate_template_syntax(xml)
    text = visible_text(xml)
    candidates = [] if fields else detect_candidates(text)
    return {
        "ok": True, "file": template.name, "totalFields": len(fields), "fields": fields,
        "validFields": fields, "unknownFields": [], "candidates": candidates,
        "ready": len(fields) > 0, "needsReview": len(fields) == 0,
    }

def main():
    parser = argparse.ArgumentParser(description="Analisa um modelo DOCX com sintaxe restrita.")
    parser.add_argument("--template", required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(analyze_template(args.template), ensure_ascii=False))
    except Exception as error:
        print(json.dumps({"ok": False, "ready": False, "error": str(error)}, ensure_ascii=False))

if __name__ == "__main__":
    main()
