export async function saveManualToGCS(filename: string, steps: any[]) {
    // Generate a cleaner manual_id from filename
    const manualId = filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();

    const response = await fetch("http://localhost:8000/api/save-manual", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            manual_id: manualId,
            steps: steps,
        }),
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || `Failed to save manual: ${response.statusText}`);
    }

    return await response.json();
}
