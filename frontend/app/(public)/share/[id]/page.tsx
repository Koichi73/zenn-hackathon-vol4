import { getPublicManual } from "@/api/manual-api";
import { notFound } from "next/navigation";
import Image from "next/image";

// Next.js 15+ or recent versions might require params to be awaited or handled differently in some contexts,
// but for standard dynamic routes:
export default async function SharePage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const manual = await getPublicManual(params.id);

    if (!manual) {
        notFound();
    }

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

                <div className="space-y-12">
                    {manual.steps.map((step, index) => (
                        <div key={index} className="bg-white shadow rounded-lg overflow-hidden ring-1 ring-black/5">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                                            {index + 1}
                                        </span>
                                        {step.title}
                                    </h2>
                                    {step.timestamp && (
                                        <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {step.timestamp}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap ml-10">
                                    {step.description}
                                </p>
                            </div>
                            {step.image_url && (
                                <div className="relative aspect-video w-full bg-gray-100 border-t border-gray-100">
                                    {/* Using unoptimized image for simplicity if next.config is set. 
                                        Otherwise might need remotePatterns. */}
                                    <Image
                                        src={step.image_url}
                                        alt={step.title}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
