from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from src.models import Message, ChatResponse
from src.agent import chat_agent
from src.memory import memory_store

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/agent")
async def process_message(message: Message) -> ChatResponse:
    try:
        response = await chat_agent.process_message(message)
        return ChatResponse(response=response)
    except Exception as e:
        return ChatResponse(
            response="",
            error=str(e)
        )

@app.get("/api/threads/{thread_id}")
async def get_thread_messages(thread_id: str):
    thread = memory_store.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    return thread

@app.delete("/api/threads/{thread_id}")
async def delete_thread(thread_id: str):
    memory_store.delete_thread(thread_id)
    return {"status": "success"}
