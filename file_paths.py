import os

CURRENT_DIR = os.path.dirname(__file__)
DB_DIR = os.path.join(CURRENT_DIR, "db")
RECEIPTS_DB_URL = "sqlite:///" + DB_DIR + "/receipts.db"

FRONTEND_DIR = os.path.join(CURRENT_DIR, "frontend")
