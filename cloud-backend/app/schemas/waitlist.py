from pydantic import BaseModel, EmailStr
from datetime import datetime


class WaitlistSignupRequest(BaseModel):
    email: EmailStr


class WaitlistEntry(BaseModel):
    id: str
    email: str
    source: str
    created_at: datetime


class WaitlistSignupResponse(BaseModel):
    ok: bool
    message: str
