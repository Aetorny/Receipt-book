from fastapi.responses import FileResponse
from fastapi import APIRouter

import os

from file_paths import FRONTEND_DIR


router = APIRouter(prefix="")

@router.get("/")
async def root() -> FileResponse:
    '''
    Возвращает главную страницу
    '''
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))
