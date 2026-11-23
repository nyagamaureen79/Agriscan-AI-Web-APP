from langchain_text_splitters import RecursiveCharacterTextSplitter


def chunk_text(text: str):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=120,
        separators=[
            "\n\n",
            "\n",
            ". ",
            " ",
            ""
        ]
    )

    chunks = splitter.split_text(text)

    return [c.strip() for c in chunks if c.strip()]