from fastapi import APIRouter, Depends
from pymongo.database import Database

from app.api.deps import get_db
from app.schemas.waitlist import WaitlistSignupRequest, WaitlistSignupResponse
from app.services.waitlist_service import waitlist_service

router = APIRouter(prefix="/waitlist", tags=["waitlist"])


@router.post("", response_model=WaitlistSignupResponse)
def join_waitlist(body: WaitlistSignupRequest, db: Database = Depends(get_db)):
    entry = waitlist_service.add(db, email=body.email)

    if entry is None:
        return WaitlistSignupResponse(
            ok=True,
            message="You're already on the list!",
        )

    return WaitlistSignupResponse(
        ok=True,
        message="You're on the list — we'll be in touch!",
    )
