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
    const [toggling, setToggling] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/share/${manualId}`
        : '';

    useEffect(() => {
        if (isOpen && manualId) {
            setLoading(true);
            getPublicManual(manualId)
                .then((data) => {
                    setIsPublic(!!data);
                })
                .catch(() => setIsPublic(false))
                .finally(() => setLoading(false));
        }
    }, [isOpen, manualId]);

    const handleTogglePublish = async () => {
        setToggling(true);
        try {
            const newState = !isPublic;
            await toggleManualPublish(manualId, newState);
            setIsPublic(newState);
        } catch (error) {
            console.error("Failed to toggle manual visibility:", error);
        } finally {
            setToggling(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isPublic ? (
                                <Globe className="w-5 h-5 text-green-600" />
                            ) : (
                                <Lock className="w-5 h-5 text-slate-400" />
                            )}
                            <DialogTitle className="text-lg font-semibold">
                                {isPublic ? 'Public Manual' : 'Private Manual'}
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    {/* Toggle Switch */}
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-3">
                            {isPublic ? (
                                <Globe className="w-4 h-4 text-green-600" />
                            ) : (
                                <Lock className="w-4 h-4 text-slate-500" />
                            )}
                            <div>
                                <p className="text-sm font-medium">
                                    {isPublic ? 'Public Access' : 'Private Access'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleTogglePublish}
                            disabled={loading || toggling}
                            className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                                isPublic ? "bg-green-600" : "bg-slate-300",
                                (loading || toggling) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                    isPublic ? "translate-x-6" : "translate-x-1"
                                )}
                            />
                        </button>
                    </div>

                    {/* Share URL Section */}
                    {loading ? (
                        <div className="flex items-center justify-center h-20 gap-2 text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Loading...</span>
                        </div>
                    ) : isPublic && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Share Link</label>
                            <div className="flex gap-2">
                                <Input
                                    value={shareUrl}
                                    readOnly
                                    className="text-sm bg-slate-50 border-slate-200"
                                />
                                <Button
                                    size="sm"
                                    className={cn(
                                        "shrink-0 transition-colors",
                                        copied ? "bg-green-600 hover:bg-green-700" : "bg-slate-900 hover:bg-black"
                                    )}
                                    onClick={handleCopy}
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    <span className="ml-2 text-xs">{copied ? "Copied" : "Copy"}</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
