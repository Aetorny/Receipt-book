import os
import json

from typing import Any
from models import TagModel, ReceiptModel


class ReceiptsDatabase:
    def __init__(self, path: str):
        self.path = path
        self.data: dict[str, list[dict[str, Any]]] = {}
        self._read()

    def _read(self):
        if not os.path.exists(self.path):
            self._write()
        with open(self.path, "r") as f:
            self.data = json.load(f)

    def _write(self):
        with open(self.path, "w") as f:
            json.dump(self.data, f, indent=4, ensure_ascii=False)

    def get_tags(self) -> list[dict[str, Any]]:
        return self.data.get('tags', [])

    def get_receipts(self) -> list[dict[str, Any]]:
        return self.data.get('receipts', [])

    def get_receipt_image(self, receipt_name: str) -> str | None:
        for receipt in self.data.get('receipts', []):
            if receipt["receipt_name"] == receipt_name:
                return receipt["image_path"]

    def add_tag(self, tag_name: TagModel):
        if 'tags' not in self.data:
            self.data["tags"] = []
        self.data["tags"].append(tag_name.model_dump())
        self._write()

    def add_receipt(self, receipt: ReceiptModel):
        if 'receipts' not in self.data:
            self.data["receipts"] = []
        data = receipt.model_dump()
        if data['image_path'] is not None:
            data['image_path'] = data['image_path'].strip(''' "'\\/ ''')
        self.data["receipts"].append(data)
        self._write()

    def update_receipt(self, receipt_name: str, updated_data: ReceiptModel):
        for receipt in self.data["receipts"]:
            if receipt["receipt_name"] == receipt_name:
                receipt = updated_data.model_dump()
                self._write()
                return

    def remove_tag(self, tag_name: str):
        self.data["tags"] = [tag for tag in self.data["tags"] if tag["tag_name"] != tag_name]
        self.data["receipts"] = [receipt for receipt in self.data["receipts"] if receipt["tag_name"] != tag_name]
        self._write()

    def remove_receipt(self, receipt_name: str):
        self.data["receipts"] = [receipt for receipt in self.data["receipts"] if receipt["receipt_name"] != receipt_name]
        self._write()
