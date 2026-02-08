from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.services.comment_service import CommentService
from typing import List, Dict, Any, Optional

router = APIRouter()


class CommentCreateRequest(BaseModel):
    manual_id: str
    step_index: int
    author_name: str
    content: str


class UnreadCountsRequest(BaseModel):
    manual_ids: List[str]


@router.post("/comments")
async def create_comment(
    request: CommentCreateRequest,
    x_user_id: Optional[str] = Header(None)
):
    """
    コメントを投稿する
    """
    try:
        service = CommentService()
        comment = await service.add_comment(
            manual_id=request.manual_id,
            step_index=request.step_index,
            author_name=request.author_name,
            content=request.content,
            user_id=x_user_id
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
        comments = await service.get_comments(manual_id, step_index)
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
        all_comments = await service.get_all_comments(manual_id)
        
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


@router.post("/comments/manuals/{manual_id}/mark-read")
async def mark_manual_as_read(
    manual_id: str,
    x_user_id: Optional[str] = Header(None)
):
    """
    マニュアルのコメントを既読にマーク
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        service = CommentService()
        await service.mark_manual_as_read(x_user_id, manual_id)
        return {
            "status": "success",
            "message": "Manual marked as read"
        }
    except Exception as e:
        print(f"Error marking manual as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/comments/manuals/{manual_id}/unread-count")
async def get_unread_count(
    manual_id: str,
    x_user_id: Optional[str] = Header(None)
):
    """
    未読コメント数を取得
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        service = CommentService()
        count = await service.get_unread_count(x_user_id, manual_id)
        return {
            "manual_id": manual_id,
            "unread_count": count
        }
    except Exception as e:
        print(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/comments/manuals/unread-counts")
async def get_all_unread_counts(
    request: UnreadCountsRequest,
    x_user_id: Optional[str] = Header(None)
):
    """
    全マニュアルの未読コメント数を取得
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    
    try:
        service = CommentService()
        counts = await service.get_all_unread_counts(x_user_id, request.manual_ids)
        return {
            "unread_counts": counts
        }
    except Exception as e:
        print(f"Error getting unread counts: {e}")
        raise HTTPException(status_code=500, detail=str(e))
