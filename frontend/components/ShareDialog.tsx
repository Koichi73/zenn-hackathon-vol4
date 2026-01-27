import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Globe, Lock, Loader2 } from 'lucide-react';
import { toggleManualPublish, getPublicManual } from '@/api/manual-api';
import { cn } from '@/lib/utils';

interface ShareDialogProps {
    manualId: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ manualId, isOpen, onOpenChange }: ShareDialogProps) {
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/share/${manualId}`
        : '';

    useEffect(() => {
        if (isOpen && manualId) {
            setLoading(true);
            getPublicManual(manualId)
                .then((data) => setIsPublic(!!data))
                .catch(() => setIsPublic(false))
                .finally(() => setLoading(false));
        }
    }, [isOpen, manualId]);

    const handlePublish = async () => {
        setLoading(true);
        try {
            await toggleManualPublish(manualId, true);
            setIsPublic(true);
        } catch (error) {
            console.error("Failed to publish manual:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm p-5 gap-0">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-2">
                        {isPublic ? <Globe className="w-4 h-4 text-green-600" /> : <Lock className="w-4 h-4 text-slate-400" />}
                        <DialogTitle className="text-sm font-semibold">Share Manual</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="relative">
                    {loading && !isPublic ? (
                        <div className="flex items-center justify-center h-10 gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs">Processing...</span>
                        </div>
                    ) : !isPublic ? (
                        <Button
                            onClick={handlePublish}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-10 text-xs font-bold uppercase tracking-wider transition-all"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : "Generate Link"}
                        </Button>
                    ) : (
                        <div className="flex gap-1 animate-in fade-in duration-200">
                            <Input
                                value={shareUrl}
                                readOnly
                                className="h-10 text-[13px] bg-slate-50 border-slate-200 focus-visible:ring-indigo-600"
                            />
                            <Button
                                size="sm"
                                className={cn(
                                    "h-10 px-3 transition-colors shrink-0",
                                    copied ? "bg-green-600 hover:bg-green-700" : "bg-slate-900 hover:bg-black"
                                )}
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                <span className="ml-1.5 text-xs">{copied ? "Copied" : "Copy"}</span>
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
