# app/routers/ask.py
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter(tags=["ask"])

HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    pass

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN,
)

class AskRequest(BaseModel):
    question: str

class AskResponse(BaseModel):
    answer: str

@router.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest):
    q = (req.question or "").strip()
    if not q:
        return {"answer": "Please enter a question."}
    if not os.getenv("HF_TOKEN"):
        raise HTTPException(status_code=500, detail="HF_TOKEN is missing on server")

    try:
        completion = client.chat.completions.create(
            model="meta-llama/Meta-Llama-3-8B-Instruct",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a finance education tutor. Explain clearly, "
                        "do NOT give investment advice, and add a short disclaimer."
                    ),
                },
                {"role": "user", "content": q},
            ],
        )

        answer = completion.choices[0].message.content or "No answer returned."
        return {"answer": answer}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))