from datetime import datetime, timezone

from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.db.mongodb import doc_to_dict


class WaitlistService:
    def add(self, db: Database, *, email: str, source: str = "landing-page") -> dict | None:
        """
        Insert a new waitlist entry. Returns the entry dict, or None if the
        email is already on the list (duplicate key).
        """
        now = datetime.now(timezone.utc)
        doc = {
            "email": email,
            "source": source,
            "created_at": now,
        }
        try:
            result = db.waitlist.insert_one(doc)
            doc["_id"] = result.inserted_id
            return doc_to_dict(doc)
        except DuplicateKeyError:
            return None

    def get_all(self, db: Database) -> list[dict]:
        return [doc_to_dict(d) for d in db.waitlist.find().sort("created_at", -1)]

    def count(self, db: Database) -> int:
        return db.waitlist.count_documents({})


waitlist_service = WaitlistService()
