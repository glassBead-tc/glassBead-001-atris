# Chatbot Backend

This is the backend service for the chatbot application, built with FastAPI and LangGraph.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up Redis:
```bash
# Using Docker
docker run -d -p 6379:6379 redis
```

3. Create a `.env` file with the following variables:
```
OPENAI_API_KEY=your_openai_api_key
REDIS_URL=redis://localhost:6379
```

4. Run the server:
```bash
uvicorn src.main:app --reload
```

## API Endpoints

- `POST /api/agent`: Process a new message
- `GET /api/threads/{thread_id}`: Get messages for a specific thread
- `DELETE /api/threads/{thread_id}`: Delete a thread

## Features

- Message persistence using Redis
- Conversation context maintenance
- Thread-based conversations
- Error handling and retry mechanisms
