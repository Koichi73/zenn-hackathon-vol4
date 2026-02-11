// マニュアルについてバックエンドに問い合わせるためのAPI

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export interface ManualStep {
    title: string;
    description: string;
    image_url: string;
    timestamp?: string;
}

export interface ManualData {
    id: string;
    title: string;
    steps: ManualStep[];
    updated_at: string;
    is_public: boolean;
}

// マニュアルの取得
export async function getPublicManual(manualId: string): Promise<ManualData> {
    const res = await fetch(`${API_BASE_URL}/public/manuals/${manualId}`, { cache: 'no-store' });
    if (!res.ok) {
        if (res.status === 404) return null as any;
        throw new Error('Failed to fetch manual');
    }
    return res.json();
}

import { auth } from "@/lib/firebase";

// マニュアルの公開状態の更新
export async function toggleManualPublish(manualId: string, isPublic: boolean) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const token = await user.getIdToken();

    const res = await fetch(`${API_BASE_URL}/manuals/${manualId}/publish`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_public: isPublic }),
    });
    if (!res.ok) throw new Error('Failed to update manual visibility');
    return res.json();
}

// マニュアルの保存
export async function saveManual(manualId: string, title: string, steps: any[]) {
    const formData = new FormData();
    formData.append("manual_id", manualId);
    formData.append("title", title);
    formData.append("steps", JSON.stringify(steps));

    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/save-manual`, {
        method: "POST",
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData,
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Failed to save manual: ${response.statusText}`);
    }

    return await response.json();
}

// マニュアルの削除
export async function deleteManual(manualId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    const token = await user.getIdToken();

    const response = await fetch(`${API_BASE_URL}/manuals/${manualId}`, {
        method: "DELETE",
        headers: {
            'Authorization': `Bearer ${token}`
        },
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Failed to delete manual: ${response.statusText}`);
    }

    return await response.json();
}


