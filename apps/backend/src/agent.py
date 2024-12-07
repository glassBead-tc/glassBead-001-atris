from typing import Dict, List, Tuple, Any
from langgraph.prebuilt import ToolExecutor
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.schema.runnable import Runnable, RunnableConfig
from langchain.schema.output_parser import StrOutputParser
from src.config import OPENAI_API_KEY
from src.memory import memory_store
from src.models import Message

class ChatAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model="gpt-4-turbo-preview",
            temperature=0.7,
            api_key=OPENAI_API_KEY
        )
        
        self.prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content=(
                "You are a helpful AI assistant engaged in a conversation. "
                "Maintain context of the conversation and provide relevant, "
                "accurate responses based on the chat history."
            )),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])
        
        self.chain = self.prompt | self.llm | StrOutputParser()

    def _format_chat_history(self, messages: List[Message]) -> List[Any]:
        formatted_messages = []
        for msg in messages:
            if msg.role == "user":
                formatted_messages.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                formatted_messages.append(AIMessage(content=msg.content))
        return formatted_messages

    async def process_message(self, message: Message) -> str:
        # Get chat history
        thread_messages = memory_store.get_thread_messages(message.thread_id)
        chat_history = self._format_chat_history(thread_messages)
        
        # Generate response
        response = await self.chain.ainvoke({
            "chat_history": chat_history,
            "input": message.content
        })
        
        # Save user message and response
        memory_store.save_message(message)
        memory_store.save_message(Message(
            content=response,
            role="assistant",
            thread_id=message.thread_id
        ))
        
        return response

chat_agent = ChatAgent()
