from pydantic import BaseModel
from typing import Optional, Any, Literal
from datetime import datetime


class UserSettingsCreateRequest(BaseModel):
    default_provider: Literal["claude"] = "claude"
    default_model: Literal["claude-haiku-4-5"] = "claude-haiku-4-5"
    preferences: Optional[dict] = None


class UserSettingsUpdate(BaseModel):
    default_provider: Optional[Literal["claude"]] = None
    default_model: Optional[Literal["claude-haiku-4-5"]] = None
    preferences: Optional[dict] = None


class UserSettings(BaseModel):
    id: str
    user_id: str
    default_provider: Literal["claude"] = "claude"
    default_model: Literal["claude-haiku-4-5"] = "claude-haiku-4-5"
    preferences: Optional[Any] = None
    updated_at: datetime
