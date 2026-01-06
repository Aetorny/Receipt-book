from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import os

from file_paths import CURRENT_DIR



def get_app() -> FastAPI:
    '''
    Создаёт экземпляр FastAPI и настраивает его
    '''
    app = FastAPI(title="Книга рецептов", redoc_url=None)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"], # Для разработки, допускает запросы только с локального сервера
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount("/static", StaticFiles(directory=os.path.join(CURRENT_DIR, "frontend", "static")), name="static")

    return app


def bind_routes(app: FastAPI, routes: list[APIRouter]) -> None:
    '''
    Добавляет в приложение api маршруты
    '''
    for route in routes:
        app.include_router(route)
