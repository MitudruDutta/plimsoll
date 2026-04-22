
class HumanMessageRequest(BaseModel):
    """Human sends message"""
    conversation_id: int
    content: str
    agent_name: str = "Human agent"

class UpdateHandoffRequest(BaseModel):
    """Update handoff status"""
    status: str  # pending/processing/completed
    agent_name: Optional[str] = None
