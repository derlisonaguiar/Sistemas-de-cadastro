import argparse
import json
from pathlib import Path

from docxtpl import DocxTemplate, InlineImage
from docx.shared import Mm
from PIL import Image


MAX_LOGO_WIDTH_MM = 50
MAX_LOGO_HEIGHT_MM = 25


def normalize_empty_values(value):
    """
    Percorre dicionários e listas para garantir
    que valores None virem string vazia.
    """

    if isinstance(value, dict):
        return {
            key: normalize_empty_values(item)
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            normalize_empty_values(item)
            for item in value
        ]

    if value is None:
        return ""

    return value


def calculate_logo_size(
    image_path: str,
    max_width_mm: float = MAX_LOGO_WIDTH_MM,
    max_height_mm: float = MAX_LOGO_HEIGHT_MM,
):
    """
    Calcula o tamanho da logo mantendo
    a proporção original.

    A imagem nunca ultrapassa os limites
    definidos em largura e altura.
    """

    with Image.open(image_path) as image:
        width_px, height_px = image.size

    if width_px <= 0 or height_px <= 0:
        return max_width_mm, max_height_mm

    image_ratio = width_px / height_px
    max_ratio = max_width_mm / max_height_mm

    if image_ratio >= max_ratio:
        width_mm = max_width_mm
        height_mm = width_mm / image_ratio
    else:
        height_mm = max_height_mm
        width_mm = height_mm * image_ratio

    return width_mm, height_mm


def add_logo_to_context(
    doc: DocxTemplate,
    context: dict,
    logo_path: str | None,
):
    """
    Adiciona a logo da organização no campo:

    {{ organization.logoImage }}

    Se não houver logo cadastrada ou o arquivo
    não existir, o campo fica vazio.
    """

    if "organization" not in context:
        context["organization"] = {}

    if not logo_path:
        context["organization"]["logoImage"] = ""
        return

    logo = Path(logo_path)

    if not logo.exists():
        context["organization"]["logoImage"] = ""
        return

    try:
        width_mm, height_mm = calculate_logo_size(
            str(logo)
        )

        context["organization"]["logoImage"] = InlineImage(
            doc,
            str(logo),
            width=Mm(width_mm),
            height=Mm(height_mm),
        )

    except Exception as error:
        print(
            f"Não foi possível carregar a logo: {error}"
        )

        context["organization"]["logoImage"] = ""


def generate_document(
    template_path: str,
    output_path: str,
    data_path: str,
    logo_path: str | None = None,
):
    template = Path(template_path)
    output = Path(output_path)
    data_file = Path(data_path)

    if not template.exists():
        raise FileNotFoundError(
            f"Modelo não encontrado: {template}"
        )

    if not data_file.exists():
        raise FileNotFoundError(
            f"Arquivo de dados não encontrado: {data_file}"
        )

    with open(
        data_file,
        "r",
        encoding="utf-8",
    ) as file:
        context = json.load(file)

    context = normalize_empty_values(
        context
    )

    doc = DocxTemplate(
        str(template)
    )

    add_logo_to_context(
        doc,
        context,
        logo_path,
    )

    doc.render(
        context
    )

    output.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    doc.save(
        str(output)
    )

    print(
        json.dumps(
            {
                "ok": True,
                "output": str(output),
                "logo": {
                    "used": bool(
                        logo_path
                    ),
                    "maxWidthMm":
                        MAX_LOGO_WIDTH_MM,
                    "maxHeightMm":
                        MAX_LOGO_HEIGHT_MM,
                },
            },
            ensure_ascii=False,
        )
    )


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Motor de geração de documentos DOCX"
        )
    )

    parser.add_argument(
        "--template",
        required=True,
        help="Caminho do modelo DOCX",
    )

    parser.add_argument(
        "--output",
        required=True,
        help="Caminho do DOCX gerado",
    )

    parser.add_argument(
        "--data",
        required=True,
        help="Arquivo JSON contendo os dados",
    )

    parser.add_argument(
        "--logo",
        required=False,
        help="Caminho da logo da organização",
    )

    args = parser.parse_args()

    try:
        generate_document(
            template_path=args.template,
            output_path=args.output,
            data_path=args.data,
            logo_path=args.logo,
        )

    except Exception as error:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": str(error),
                },
                ensure_ascii=False,
            )
        )

        raise


if __name__ == "__main__":
    main()