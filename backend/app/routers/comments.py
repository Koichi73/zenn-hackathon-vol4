from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.comment_service import CommentService
from typing import List, Dict, Any

router = APIRouter()


class CommentCreateRequest(BaseModel):
    manual_id: str
    step_index: int
    author_name: str
    content: str


@router.post("/comments")
async def create_comment(request: CommentCreateRequest):
    """
    コメントを投稿する
    """
    try:
        service = CommentService()
        comment = service.add_comment(
            manual_id=request.manual_id,
            step_index=request.step_index,
            author_name=request.author_name,
            content=request.content
        )
        return {
            "status": "success",
            "comment": comment
        }
    except Exception as e:
        print(f"Comment creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comments/{manual_id}/steps/{step_index}")
async def get_step_comments(manual_id: str, step_index: int):
    """
    特定のステップのコメントを取得
    """
    try:
        service = CommentService()
        comments = service.get_comments(manual_id, step_index)
        return {
            "manual_id": manual_id,
            "step_index": step_index,
            "comments": comments
        }
    except Exception as e:
        print(f"Error fetching comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comments/{manual_id}")
async def get_all_manual_comments(manual_id: str):
    """
    マニュアル全体のコメントを取得
    """
    try:
        service = CommentService()
        all_comments = service.get_all_comments(manual_id)
        
        # レスポンス形式を整形
        comments_by_step = [
            {
                "step_index": step_idx,
                "comments": comments
            }
            for step_idx, comments in all_comments.items()
        ]
        
        return {
            "manual_id": manual_id,
            "comments": comments_by_step
        }
    except Exception as e:
        print(f"Error fetching all comments: {e}")
        raise HTTPException(status_code=500, detail=str(e))
