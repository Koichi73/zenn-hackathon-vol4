import json

class ManualFormatService:
    @staticmethod
    def to_json(steps: list[dict]) -> str:
        """手順リストをJSON文字列に変換"""
        return json.dumps(steps, ensure_ascii=False, indent=2)
