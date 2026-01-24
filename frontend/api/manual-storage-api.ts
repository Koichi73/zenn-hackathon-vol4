export async function saveManualToGCS(filename: string, steps: any[], videoFile: File | null) {
    // Generate a cleaner manual_id from filename
    const manualId = filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const formData = new FormData();
    formData.append("manual_id", manualId);
    formData.append("steps", JSON.stringify(steps));
    if (videoFile) {
        formData.append("video", videoFile);
    }

    const response = await fetch("http://localhost:8000/api/save-manual", {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Failed to save manual: ${response.statusText}`);
    }

    return await response.json();
}
