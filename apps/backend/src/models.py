from typing import List, Optional
from pydantic import BaseModel

class Message(BaseModel):
    content: str
    role: str
    thread_id: str

class ChatResponse(BaseModel):
    response: str
    error: Optional[str] = None

class Thread(BaseModel):
    id: str
    messages: List[Message]
    metadata: dict = {}
