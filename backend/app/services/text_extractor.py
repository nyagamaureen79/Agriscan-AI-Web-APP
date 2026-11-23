import pdfplumber

from docx import Document as DocxDocument


def extract_text(file_path: str) -> str:

    if file_path.endswith(".pdf"):

        full_text = []

        with pdfplumber.open(file_path) as pdf:

            for page in pdf.pages:

                page_text = page.extract_text()

                if page_text:
                    full_text.append(page_text)

        return "\n".join(full_text)

    if file_path.endswith(".docx"):

        doc = DocxDocument(file_path)

        return "\n".join(
            [p.text for p in doc.paragraphs]
        )

    if file_path.endswith(".txt"):

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as f:
            return f.read()

    return ""