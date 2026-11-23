import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_rag_response(query: str, chunks: list):

    if not chunks:
        return {
            "answer": "I could not find that information in the available documents.",
            "citations": []
        }

    context = "\n\n".join([chunk.chunk_text for chunk in chunks])

    # Deduplicate — one entry per unique file, no chunk numbers
    seen = set()
    citations = []
    for chunk in chunks:
        if chunk.file_name not in seen:
            seen.add(chunk.file_name)
            citations.append({
                "document": chunk.file_name,
                "document_id": chunk.document_id,
            })

    prompt = f"""You are a helpful AI assistant.

Answer ONLY using the provided context.

If the answer is not in the context, say:
"I could not find that information."

CONTEXT:
{context}

QUESTION:
{query}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "You answer questions from retrieved documents."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0
    )

    return {
        "answer": response.choices[0].message.content,
        "citations": citations
    }