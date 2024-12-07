from typing import Dict, List, Optional
import json
from redis import Redis
from src.config import REDIS_URL
from src.models import Message, Thread

class RedisMemoryStore:
    def __init__(self):
        self.redis = Redis.from_url(REDIS_URL, decode_responses=True)
        self.message_ttl = 60 * 60 * 24  # 24 hours

    def _get_thread_key(self, thread_id: str) -> str:
        return f"thread:{thread_id}"

    def save_message(self, message: Message):
        thread_key = self._get_thread_key(message.thread_id)
        
        # Get existing messages
        messages_json = self.redis.get(thread_key)
        messages = json.loads(messages_json) if messages_json else []
        
        # Add new message
        messages.append(message.dict())
        
        # Save updated messages
        self.redis.setex(
            thread_key,
            self.message_ttl,
            json.dumps(messages)
        )

    def get_thread_messages(self, thread_id: str, limit: Optional[int] = None) -> List[Message]:
        thread_key = self._get_thread_key(thread_id)
        messages_json = self.redis.get(thread_key)
        
        if not messages_json:
            return []
        
        messages = json.loads(messages_json)
        if limit:
            messages = messages[-limit:]
            
        return [Message(**msg) for msg in messages]

    def get_thread(self, thread_id: str) -> Optional[Thread]:
        messages = self.get_thread_messages(thread_id)
        if not messages:
            return None
            
        return Thread(
            id=thread_id,
            messages=messages
        )

    def delete_thread(self, thread_id: str):
        thread_key = self._get_thread_key(thread_id)
        self.redis.delete(thread_key)

memory_store = RedisMemoryStore()
