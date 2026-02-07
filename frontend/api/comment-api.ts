// コメントAPI用のクライアント関数

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface Comment {
    id: string;
    author_name: string;
    content: string;
    created_at: any; // Firestore timestamp
}

export interface CommentCreateRequest {
    manual_id: string;
    step_index: number;
    author_name: string;
    content: string;
}

// コメントを投稿
export async function addComment(
    manualId: string,
    stepIndex: number,
    authorName: string,
    content: string
): Promise<Comment> {
    const res = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            manual_id: manualId,
            step_index: stepIndex,
            author_name: authorName,
            content: content,
        }),
    });

    if (!res.ok) {
        throw new Error('Failed to add comment');
    }

    const data = await res.json();
    return data.comment;
}

// 特定ステップのコメントを取得
export async function getComments(manualId: string, stepIndex: number): Promise<Comment[]> {
    const res = await fetch(`${API_BASE_URL}/comments/${manualId}/steps/${stepIndex}`, {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('Failed to fetch comments');
    }

    const data = await res.json();
    return data.comments;
}

// マニュアル全体のコメントを取得
export async function getAllComments(manualId: string): Promise<{ step_index: number; comments: Comment[] }[]> {
    const res = await fetch(`${API_BASE_URL}/comments/${manualId}`, {
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error('Failed to fetch all comments');
    }

    const data = await res.json();
    return data.comments;
}
