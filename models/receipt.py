from pydantic import BaseModel, Field

from typing import Optional


class ReceiptModel(BaseModel):
    receipt_name: str
    description: str = Field(..., description="Текст рецепта в markdown")
    image_path: Optional[str] = None
    
    tag_name: str
