import { getPublicManual } from "@/api/manual-api";
import { notFound } from "next/navigation";
import { ManualPreview } from "@/components/features/manual/ManualPreview";
import { SharePageHeader } from "@/components/features/share/SharePageHeader";

function generateMarkdown(manual: any): string {
    let md = '';

    manual.steps.forEach((step: any, index: number) => {
        md += `## Step ${index + 1}: ${step.title}\n\n`;

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

        md += `${step.description}\n\n`;

        md += `---\n\n`;
    });

    return md;
}

// Next.js 15+ or recent versions might require params to be awaited or handled differently in some contexts,
// but for standard dynamic routes:
export default async function SharePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const manual = await getPublicManual(params.id);

    if (!manual) {
        notFound();
    }

    const markdown = generateMarkdown(manual);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <SharePageHeader title={manual.title} />

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-muted/30">
                <div className="max-w-4xl mx-auto p-8">
                    <ManualPreview markdown={markdown} />
                </div>
            </div>
        </div>
    );
}
