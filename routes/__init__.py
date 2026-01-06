from .pages import router as page_router
from .receipts import router as receipts_router
from .tags import router as tags_router


routes = [
    page_router,
    receipts_router,
    tags_router
]

__all__ = ["routes"]
