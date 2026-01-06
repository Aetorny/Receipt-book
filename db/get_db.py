import os

from db import ReceiptsDatabase
from file_paths import DB_DIR


def get_receipts_db():
    db = ReceiptsDatabase(os.path.join(DB_DIR, "receipts.json"))
    yield db
