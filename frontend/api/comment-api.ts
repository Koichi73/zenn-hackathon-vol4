// コメントAPI用のクライアント関数

import { auth } from '@/lib/firebase';

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
    const user = auth.currentUser;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (user) {
        headers['X-User-Id'] = user.uid;
    }

    const res = await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST',
        headers: headers,
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

// マニュアルを既読にマーク
export async function markManualAsRead(manualId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error('User not authenticated');
    }

    const res = await fetch(`${API_BASE_URL}/comments/manuals/${manualId}/mark-read`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.uid,
        },
    });

    if (!res.ok) {
        throw new Error('Failed to mark manual as read');
    }
}

// 未読コメント数を取得
export async function getUnreadCount(manualId: string): Promise<number> {
    const user = auth.currentUser;
    if (!user) {
        return 0; // 未認証の場合は0を返す
    }

    const res = await fetch(`${API_BASE_URL}/comments/manuals/${manualId}/unread-count`, {
        headers: {
            'X-User-Id': user.uid,
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        console.error('Failed to fetch unread count');
        return 0;
    }

    const data = await res.json();
    return data.unread_count;
}

// ステップごとの未読コメント数を取得
export async function getUnreadCountsByStep(manualId: string): Promise<{ [stepIndex: number]: number }> {
    const user = auth.currentUser;
    if (!user) {
        return {};
    }

    const res = await fetch(`${API_BASE_URL}/comments/manuals/${manualId}/unread-counts-by-step`, {
        headers: {
            'X-User-Id': user.uid,
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        console.error('Failed to fetch unread counts by step');
        return {};
    }

    const data = await res.json();
    return data.unread_counts;
}

// 全マニュアルの未読コメント数を取得
export async function getAllUnreadCounts(manualIds: string[]): Promise<{ [manualId: string]: number }> {
    const user = auth.currentUser;
    if (!user || manualIds.length === 0) {
        return {};
    }

    const res = await fetch(`${API_BASE_URL}/comments/manuals/unread-counts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user.uid,
        },
        body: JSON.stringify({
            manual_ids: manualIds,
        }),
        cache: 'no-store',
    });

    if (!res.ok) {
        console.error('Failed to fetch unread counts');
        return {};
    }

    const data = await res.json();
    return data.unread_counts;
}
