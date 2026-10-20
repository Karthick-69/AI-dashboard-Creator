from fastapi import APIRouter, HTTPException
from app.core.session import session_manager
from app.schemas.chat import ChatRequest, ChatResponse
from app.chatbot.agent import handle_chat_message

router = APIRouter()

@router.post("/{session_id}/chat", response_model=ChatResponse)
async def chat_with_data(session_id: str, payload: ChatRequest):
    """Processes user natural language queries with dataset context and real calculations."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")

    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    return handle_chat_message(
        session=session,
        message=payload.message,
        active_filters=payload.active_filters
    )

@router.post("/{session_id}/chat/clear")
async def clear_chat_history(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Dataset session not found or expired.")
    session.chat_history.clear()
    return {"message": "Chat history cleared."}
