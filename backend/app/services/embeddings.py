import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("[EMBEDDINGS] OPENAI_API_KEY is not set!")


client = OpenAI(api_key=api_key)

@retry(
    stop=stop_after_attempt(2),
    wait=wait_exponential(multiplier=1, min=2, max=5),
    reraise=True
)
def get_embedding(text: str):
    try:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=text
        )
        return response.data[0].embedding
    except Exception as e:
        print(f"[EMBEDDINGS ERROR] {type(e).__name__}: {str(e)}", flush=True)
        raise
