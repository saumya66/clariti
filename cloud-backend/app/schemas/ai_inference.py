from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class AIInferenceRequest(BaseModel):
    mode: Literal["messages", "beta_messages"] = "messages"
    payload: dict[str, Any]
    agent: str = Field(default="unknown", max_length=120)
    call_site: str = Field(default="unknown", max_length=120)
    call_number: Optional[int] = None


class AICreditResponse(BaseModel):
    free_credit_microusd: int
    spent_microusd: int
    remaining_microusd: int
    ai_access_status: str
