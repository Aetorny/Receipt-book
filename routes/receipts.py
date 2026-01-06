from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, RedirectResponse

import os

from db import get_receipts_db, ReceiptsDatabase
from models import ReceiptModel


router = APIRouter(prefix="/api")


@router.get("/receipts")
async def get_receipts(db: ReceiptsDatabase = Depends(get_receipts_db)):
    return db.get_receipts()

@router.get("/get_receipt_image/{receipt_name}")
async def get_receipt_image(receipt_name: str, db: ReceiptsDatabase = Depends(get_receipts_db)):
    image_path = db.get_receipt_image(receipt_name)

    if image_path is None:
        raise HTTPException(status_code=404, detail="Image not found")

    image_path = image_path.strip()

    if image_path.startswith("http://") or image_path.startswith("https://"):
        return RedirectResponse(url=image_path)

    if os.path.exists(image_path):
        return FileResponse(image_path)

    raise HTTPException(status_code=404, detail="Image not found")

@router.post("/add_receipt")
async def add_product(receipt: ReceiptModel, db: ReceiptsDatabase = Depends(get_receipts_db)) -> dict[str, bool]:
    db.add_receipt(receipt)
    return {"success": True}

@router.delete("/delete_receipt/{receipt_name}")
async def delete_product(receipt_name: str, db: ReceiptsDatabase = Depends(get_receipts_db)):
    db.remove_receipt(receipt_name)
    return {"success": True}

@router.put("/update_receipt/{receipt_name}")
async def update_receipt(
    receipt_name: str, 
    updated_data: ReceiptModel, 
    db: ReceiptsDatabase = Depends(get_receipts_db)
):
    """
    receipt_name: Старое имя рецепта (чтобы найти его в БД)
    updated_data: Новые данные (имя, описание, картинка, тег)
    """
    try:
        db.update_receipt(receipt_name, updated_data)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
