import argparse
import json
import re
from pathlib import Path
from zipfile import ZipFile


ALLOWED_FIELDS = {
    # Organização
    "organization.name",
    "organization.shortName",
    "organization.cnpj",
    "organization.email",
    "organization.phone",
    "organization.website",
    "organization.address",
    "organization.city",
    "organization.state",
    "organization.logoImage",

    # Membro
    "member.fullName",
    "member.email",
    "member.cpf",
    "member.phone",
    "member.course",
    "member.registration",
    "member.nationality",
    "member.maritalStatus",
    "member.rg",
    "member.rgIssuer",
    "member.address",
    "member.addressNumber",
    "member.neighborhood",
    "member.cep",
    "member.city",
    "member.state",
    "member.directorate.name",
    "member.position.name",

    # Representante
    "representative.fullName",
    "representative.email",
    "representative.cpf",
    "representative.phone",
    "representative.course",
    "representative.nationality",
    "representative.maritalStatus",
    "representative.rg",
    "representative.rgIssuer",
    "representative.position",

    # Cliente
    "client.name",
    "client.companyName",
    "client.cpfCnpj",
    "client.email",
    "client.phone",
    "client.contactName",
    "client.address",

    # Projeto
    "project.name",
    "project.description",
    "project.startDate",
    "project.endDate",
    "project.budget",

    # Contrato
    "contract.title",
    "contract.contractNumber",
    "contract.value",
    "contract.startDate",
    "contract.endDate",

    # Sistema
    "system.currentDate",
}


PLACEHOLDER_PATTERN = re.compile(
    r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}"
)


def extract_docx_text(docx_path: Path) -> str:
    """
    Lê os XMLs principais de um DOCX e junta o conteúdo textual.
    """

    with ZipFile(docx_path, "r") as zip_file:
        xml_files = [
            name
            for name in zip_file.namelist()
            if name.startswith("word/")
            and name.endswith(".xml")
            and (
                "document.xml" in name
                or "header" in name
                or "footer" in name
            )
        ]

        parts = []

        for xml_name in xml_files:
            try:
                content = zip_file.read(xml_name)
                parts.append(
                    content.decode(
                        "utf-8",
                        errors="ignore",
                    )
                )
            except Exception:
                continue

        return "\n".join(parts)


def extract_placeholders(text: str) -> list[str]:
    """
    Extrai placeholders no formato:

    {{ organization.name }}
    {{ member.fullName }}
    """

    matches = PLACEHOLDER_PATTERN.findall(text)

    unique_fields = sorted(set(matches))

    return unique_fields


def analyze_template(template_path: str) -> dict:
    template = Path(template_path)

    if not template.exists():
        raise FileNotFoundError(
            f"Arquivo não encontrado: {template}"
        )

    if template.suffix.lower() != ".docx":
        raise ValueError(
            "O arquivo precisa estar no formato DOCX."
        )

    text = extract_docx_text(template)

    fields = extract_placeholders(text)

    valid_fields = []
    unknown_fields = []

    for field in fields:
        if field in ALLOWED_FIELDS:
            valid_fields.append(field)
        else:
            unknown_fields.append(field)

    return {
        "ok": len(unknown_fields) == 0,
        "file": template.name,
        "totalFields": len(fields),
        "fields": fields,
        "validFields": valid_fields,
        "unknownFields": unknown_fields,
        "ready": (
            len(fields) > 0
            and len(unknown_fields) == 0
        ),
    }


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Analisa placeholders de um modelo DOCX."
        )
    )

    parser.add_argument(
        "--template",
        required=True,
        help="Caminho do arquivo DOCX",
    )

    args = parser.parse_args()

    try:
        result = analyze_template(
            args.template
        )

        print(
            json.dumps(
                result,
                ensure_ascii=False,
                indent=2,
            )
        )

    except Exception as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "ready": False,
                    "error": str(error),
                },
                ensure_ascii=False,
                indent=2,
            )
        )


if __name__ == "__main__":
    main()