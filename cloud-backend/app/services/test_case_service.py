from datetime import datetime, timezone
from typing import Optional, List

from bson import ObjectId
from pymongo.database import Database

from app.db.mongodb import doc_to_dict


class TestCaseService:
    COL = "test_cases"

    def get(self, db: Database, *, id: str) -> Optional[dict]:
        doc = db[self.COL].find_one({"_id": ObjectId(id)})
        return doc_to_dict(doc)

    def get_multi_by_feature(
        self,
        db: Database,
        *,
        feature_id: str,
        include_deleted: bool = False,
    ) -> List[dict]:
        query = {"feature_id": feature_id}
        if not include_deleted:
            query["deleted_at"] = None
        cursor = db[self.COL].find(query).sort("test_key", 1)
        return [doc_to_dict(d) for d in cursor]

    def create(self, db: Database, *, data: dict) -> dict:
        doc = {
            "feature_id": data["feature_id"],
            "test_key": data["test_key"],
            "title": data["title"],
            "description": data.get("description"),
            "goal": data["goal"],
            "expected_result": data.get("expected_result"),
            "priority": data.get("priority"),
            "category": data.get("category"),
            "generated_by_model": data.get("generated_by_model"),
            "created_at": datetime.now(timezone.utc),
        }
        result = db[self.COL].insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc_to_dict(doc)

    def create_bulk(self, db: Database, *, items: List[dict]) -> List[dict]:
        now = datetime.now(timezone.utc)
        docs = []
        for data in items:
            docs.append({
                "feature_id": data["feature_id"],
                "test_key": data["test_key"],
                "title": data["title"],
                "description": data.get("description"),
                "goal": data["goal"],
                "expected_result": data.get("expected_result"),
                "priority": data.get("priority"),
                "category": data.get("category"),
                "generated_by_model": data.get("generated_by_model"),
                "created_at": now,
            })
        result = db[self.COL].insert_many(docs)
        for doc, oid in zip(docs, result.inserted_ids):
            doc["_id"] = oid
        return [doc_to_dict(d) for d in docs]

    def update(self, db: Database, *, id: str, **fields) -> Optional[dict]:
        db[self.COL].update_one({"_id": ObjectId(id)}, {"$set": fields})
        return self.get(db, id=id)

    def archive_bulk(self, db: Database, *, feature_id: str, ids: List[str]) -> int:
        object_ids = [ObjectId(id) for id in ids]
        result = db[self.COL].update_many(
            {
                "_id": {"$in": object_ids},
                "feature_id": feature_id,
                "deleted_at": None,
            },
            {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        )
        return result.modified_count

    def count_active_by_ids(self, db: Database, *, feature_id: str, ids: List[str]) -> int:
        object_ids = [ObjectId(id) for id in ids]
        return db[self.COL].count_documents({
            "_id": {"$in": object_ids},
            "feature_id": feature_id,
            "deleted_at": None,
        })

    def delete_by_feature(self, db: Database, *, feature_id: str) -> int:
        """Archive the active suite while retaining test metadata for past-run replay."""
        result = db[self.COL].update_many(
            {"feature_id": feature_id, "deleted_at": None},
            {"$set": {"deleted_at": datetime.now(timezone.utc)}},
        )
        return result.modified_count


test_case_service = TestCaseService()
