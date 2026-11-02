from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from pymongo.database import Database

from app.db.mongodb import doc_to_dict
from app.services.ai_cost_service import usd_to_microusd
from app.core.config import settings


class UserService:
    COL = "users"

    def get(self, db: Database, *, id: str) -> Optional[dict]:
        doc = db[self.COL].find_one({"_id": ObjectId(id)})
        return doc_to_dict(doc)

    def get_by_email(self, db: Database, *, email: str) -> Optional[dict]:
        doc = db[self.COL].find_one({"email": email})
        return doc_to_dict(doc)

    def create(self, db: Database, *, email: str, name: Optional[str], hashed_password: str) -> dict:
        now = datetime.now(timezone.utc)
        doc = {
            "email": email,
            "name": name,
            "hashed_password": hashed_password,
            "avatar_url": None,
            "free_credit_microusd": usd_to_microusd(settings.DEFAULT_FREE_CREDIT_USD),
            "spent_microusd": 0,
            "ai_access_status": "active",
            "ai_request_active": False,
            "ai_request_started_at": None,
            "created_at": now,
            "updated_at": now,
        }
        result = db[self.COL].insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc_to_dict(doc)

    def update(self, db: Database, *, id: str, **fields) -> Optional[dict]:
        fields["updated_at"] = datetime.now(timezone.utc)
        db[self.COL].update_one({"_id": ObjectId(id)}, {"$set": fields})
        return self.get(db, id=id)


user_service = UserService()
