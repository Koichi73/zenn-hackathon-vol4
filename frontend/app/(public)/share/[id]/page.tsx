import { getPublicManual } from "@/api/manual-api";
import { notFound } from "next/navigation";
import { ManualPreview } from "@/components/features/manual/ManualPreview";

export const dynamic = 'force-dynamic';

function generateMarkdown(manual: any): string {
    let md = '';

    manual.steps.forEach((step: any, index: number) => {
        md += `## Step ${index + 1}: ${step.title}\n`;
        md += `${step.description}\n\n`;

        if (step.image_url) {
            // Combine highlight_box and mask_boxes for preview rendering
            const combinedMasks = [];
            if (step.highlight_box) {
                combinedMasks.push({
                    type: 'highlight',
                    label: 'highlight',
                    box_2d: [step.highlight_box.ymin, step.highlight_box.xmin, step.highlight_box.ymax, step.highlight_box.xmax]
                });
            }
            if (step.mask_boxes) {
                step.mask_boxes.forEach((m: any) => {
                    combinedMasks.push({
                        type: 'privacy',
                        label: m.label,
                        box_2d: [m.box.ymin, m.box.xmin, m.box.ymax, m.box.xmax]
                    });
                });
            }

            let imageUrl = step.image_url;
            if (combinedMasks.length > 0) {
                const masksJson = JSON.stringify(combinedMasks);
                const encodedMasks = encodeURIComponent(masksJson);
                imageUrl = `${step.image_url}?masks=${encodedMasks}`;
            }

            md += `![Step ${index + 1} Image](${imageUrl})\n\n`;
        }

        md += `---\n\n`;
    });

    return md;
}

export default async function SharePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const manual = await getPublicManual(params.id);

    if (!manual) {
        notFound();
    }

    const markdown = generateMarkdown(manual);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <header className="text-center">
                    <h1 className="text-3xl font-bold text-gray-900">{manual.title}</h1>
                    <div className="mt-2 text-sm text-gray-500 flex justify-center gap-4">
                        {manual.updated_at && (
                            <span>最終更新: {new Date(manual.updated_at).toLocaleDateString('ja-JP')}</span>
                        )}
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs items-center flex">
                            公開中
                        </span>
                    </div>
                </header>

                <ManualPreview markdown={markdown} manualId={params.id} />
            </div>
        </div>
    );
}
