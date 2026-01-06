from pydantic import BaseModel

from typing import Optional


class TagModel(BaseModel):
    tag_name: str
    parent_name: Optional[str] = None
