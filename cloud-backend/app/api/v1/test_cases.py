from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pydantic import BaseModel
from pymongo.database import Database
from typing import List

from app.api.deps import get_db, get_current_user
from app.schemas.test_case import TestCaseCreate, TestCaseUpdate, TestCase
from app.services.test_case_service import test_case_service
from app.services.feature_service import feature_service
from app.services.project_service import project_service

router = APIRouter(prefix="/test-cases", tags=["test-cases"])


def _verify_feature_owner(db: Database, feature_id: str, user_id: str):
    feature = feature_service.get(db, id=feature_id)
    if not feature:
        raise HTTPException(status_code=404, detail="Feature not found")
    project = project_service.get(db, id=feature["project_id"])
    if not project or project["user_id"] != user_id:
        raise HTTPException(status_code=404, detail="Feature not found")
    return feature


@router.get("/by-feature/{feature_id}", response_model=List[TestCase])
def list_test_cases(
    feature_id: str,
    include_deleted: bool = False,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _verify_feature_owner(db, feature_id, current_user["id"])
    docs = test_case_service.get_multi_by_feature(
        db,
        feature_id=feature_id,
        include_deleted=include_deleted,
    )
    return [TestCase(**d) for d in docs]


@router.post("/", response_model=TestCase)
def create_test_case(
    body: TestCaseCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _verify_feature_owner(db, body.feature_id, current_user["id"])
    doc = test_case_service.create(db, data=body.model_dump())
    return TestCase(**doc)


class TestCaseBulkCreate(BaseModel):
    feature_id: str
    items: List[TestCaseCreate]


class TestCaseBulkDelete(BaseModel):
    feature_id: str
    test_case_ids: List[str]


@router.post("/bulk", response_model=List[TestCase])
def create_test_cases_bulk(
    body: TestCaseBulkCreate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _verify_feature_owner(db, body.feature_id, current_user["id"])
    for item in body.items:
        if item.feature_id != body.feature_id:
            raise HTTPException(status_code=400, detail="All items must have matching feature_id")
    docs = test_case_service.create_bulk(db, items=[i.model_dump() for i in body.items])
    return [TestCase(**d) for d in docs]


@router.post("/bulk-delete")
def delete_test_cases_bulk(
    body: TestCaseBulkDelete,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _verify_feature_owner(db, body.feature_id, current_user["id"])

    test_case_ids = list(dict.fromkeys(body.test_case_ids))
    if not test_case_ids:
        raise HTTPException(status_code=400, detail="Select at least one test case")
    if any(not ObjectId.is_valid(test_case_id) for test_case_id in test_case_ids):
        raise HTTPException(status_code=404, detail="One or more test cases were not found")

    active_count = test_case_service.count_active_by_ids(
        db,
        feature_id=body.feature_id,
        ids=test_case_ids,
    )
    if active_count != len(test_case_ids):
        raise HTTPException(status_code=404, detail="One or more test cases were not found")

    deleted = test_case_service.archive_bulk(
        db,
        feature_id=body.feature_id,
        ids=test_case_ids,
    )
    if deleted != len(test_case_ids):
        raise HTTPException(status_code=409, detail="The test suite changed. Refresh and try again")

    return {"deleted": deleted, "test_case_ids": test_case_ids}


@router.get("/{test_case_id}", response_model=TestCase)
def get_test_case(
    test_case_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tc = test_case_service.get(db, id=test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    _verify_feature_owner(db, tc["feature_id"], current_user["id"])
    return TestCase(**tc)


@router.patch("/{test_case_id}", response_model=TestCase)
def update_test_case(
    test_case_id: str,
    body: TestCaseUpdate,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tc = test_case_service.get(db, id=test_case_id)
    if not tc:
        raise HTTPException(status_code=404, detail="Test case not found")
    _verify_feature_owner(db, tc["feature_id"], current_user["id"])

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return TestCase(**tc)

    updated = test_case_service.update(db, id=test_case_id, **updates)
    return TestCase(**updated)


@router.delete("/by-feature/{feature_id}")
def delete_test_cases_by_feature(
    feature_id: str,
    db: Database = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    _verify_feature_owner(db, feature_id, current_user["id"])
    count = test_case_service.delete_by_feature(db, feature_id=feature_id)
    return {"deleted": count}
