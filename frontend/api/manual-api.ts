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

// マニュアルの公開状態の更新
export async function toggleManualPublish(manualId: string, isPublic: boolean) {
    const res = await fetch(`${API_BASE_URL}/manuals/${manualId}/publish`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_public: isPublic }),
    });
    if (!res.ok) throw new Error('Failed to update manual visibility');
    return res.json();
}

// マニュアルの保存
export async function saveManual(filename: string, steps: any[], videoFile: File | null) {
    // Generate a cleaner manual_id from filename
    const manualId = filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const formData = new FormData();
    formData.append("manual_id", manualId);
    formData.append("steps", JSON.stringify(steps));
    if (videoFile) {
        formData.append("video", videoFile);
    }

    const response = await fetch(`${API_BASE_URL}/save-manual`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Failed to save manual: ${response.statusText}`);
    }

    return await response.json();
}
