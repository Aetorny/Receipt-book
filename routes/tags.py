from fastapi import APIRouter, Depends

from db import get_receipts_db, ReceiptsDatabase
from models import TagModel


router = APIRouter(prefix="/api")


@router.get("/tags")
async def get_tags(db: ReceiptsDatabase = Depends(get_receipts_db)):
    return db.get_tags()


@router.post("/add_tag")
async def add_tag(tag: TagModel, db: ReceiptsDatabase = Depends(get_receipts_db)):
    db.add_tag(tag)
    return {"success": True}

@router.delete("/delete_tag/{tag_name}")
async def delete_tag(tag_name: str, db: ReceiptsDatabase = Depends(get_receipts_db)):
    db.remove_tag(tag_name)
    return {"success": True}
