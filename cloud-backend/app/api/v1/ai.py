from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from app.api.deps import get_current_user, get_db
from app.schemas.ai_inference import AICreditResponse, AIInferenceRequest
from app.services.ai_inference_service import AIInferenceError, get_credit, run_inference


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/inference")
def inference(
    body: AIInferenceRequest,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return run_inference(
            db,
            user_id=current_user["id"],
            mode=body.mode,
            payload=body.payload,
            agent=body.agent,
            call_site=body.call_site,
            call_number=body.call_number,
        )
    except AIInferenceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get("/credit", response_model=AICreditResponse)
def credit(
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        return get_credit(db, current_user["id"])
    except AIInferenceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
