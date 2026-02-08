"use client";

import React, { useState, useEffect } from 'react';
import { getComments, Comment, getUnreadCount, getUnreadCountsByStep, markManualAsRead } from '@/api/comment-api';
import { MessageCircle, User, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';

interface Step {
    title: string;
    description: string;
    timestamp: string;
    image_url?: string | null;
}

interface CommentSidebarProps {
    manualId: string;
    steps: Step[];
    onStepClick?: (stepIndex: number) => void;
}

export function CommentSidebar({ manualId, steps, onStepClick }: CommentSidebarProps) {
    const [commentCounts, setCommentCounts] = useState<{ [key: number]: number }>({});
    const [selectedStep, setSelectedStep] = useState<number | null>(null);
    const [stepComments, setStepComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Load unread comment counts for all steps
    useEffect(() => {
        const loadUnreadCommentCounts = async () => {
            try {
                const counts = await getUnreadCountsByStep(manualId);
                setCommentCounts(counts);
            } catch (err) {
                console.error(`Failed to load unread counts:`, err);
                setCommentCounts({});
            }
        };

        if (manualId && steps.length > 0) {
            loadUnreadCommentCounts();
        }
    }, [manualId, steps.length, isCollapsed]);

    // Mark manual as read when sidebar is opened
    useEffect(() => {
        if (!isCollapsed && manualId) {
            const markAsRead = async () => {
                try {
                    await markManualAsRead(manualId);
                    // Refresh counts after marking as read
                    // However, we might want to keep the unread badges until user refreshes 
                    // or just clear them. Usually, opening the sidebar marks them "as being read".
                } catch (err) {
                    console.error('Failed to mark manual as read:', err);
                }
            };
            markAsRead();
        }
    }, [isCollapsed, manualId]);

    // Load comments for selected step
    const loadStepComments = async (stepIndex: number) => {
        setIsLoading(true);
        try {
            const comments = await getComments(manualId, stepIndex);
            // Sort comments in descending order (newest first)
            const sortedComments = comments.sort((a, b) => {
                const timeA = a.created_at?._seconds || new Date(a.created_at).getTime() / 1000;
                const timeB = b.created_at?._seconds || new Date(b.created_at).getTime() / 1000;
                return timeB - timeA;
            });
            setStepComments(sortedComments);
        } catch (err) {
            console.error('Failed to load comments:', err);
            setStepComments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStepClick = (stepIndex: number) => {
        if (selectedStep === stepIndex) {
            setSelectedStep(null);
            setStepComments([]);
        } else {
            setSelectedStep(stepIndex);
            loadStepComments(stepIndex);
            onStepClick?.(stepIndex);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';

        // Firestore timestamp の場合
        if (timestamp._seconds) {
            const date = new Date(timestamp._seconds * 1000);
            return date.toLocaleString('ja-JP', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        // 通常のDate文字列の場合
        try {
            const date = new Date(timestamp);
            return date.toLocaleString('ja-JP', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '';
        }
    };

    const totalComments = Object.values(commentCounts).reduce((sum, count) => sum + count, 0);

    return (
        <div className={`fixed right-4 top-36 bg-white border rounded-lg shadow-sm overflow-hidden z-20 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-fit h-fit' : 'w-[320px] bottom-4'
            }`}>
            {/* Header */}
            <div className={`bg-white flex items-center ${isCollapsed ? 'p-2 justify-center' : 'p-4 border-b justify-between'}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Comments
                        </h2>
                        {totalComments > 0 && (
                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium">
                                {totalComments}
                            </span>
                        )}
                    </div>
                )}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`flex items-center justify-center transition-all ${isCollapsed
                        ? 'w-8 h-8 rounded-full hover:bg-gray-100'
                        : 'p-1 hover:bg-gray-100 rounded'
                        }`}
                    title={isCollapsed ? 'Expand' : 'Collapse'}
                >
                    {isCollapsed ? (
                        totalComments > 0 ? (
                            <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow-sm">
                                {totalComments}
                            </div>
                        ) : (
                            <ChevronLeft className="w-5 h-5 text-gray-500" />
                        )
                    ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                    )}
                </button>
            </div>

            {/* Content - only show when not collapsed */}
            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto">
                    <div className="p-2 space-y-1">
                        {steps.map((step, index) => {
                            const commentCount = commentCounts[index] || 0;
                            const isSelected = selectedStep === index;

                            return (
                                <div key={index}>
                                    <button
                                        onClick={() => handleStepClick(index)}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center gap-2 ${isSelected
                                            ? 'bg-blue-50 text-blue-900'
                                            : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                                            }`}
                                    >
                                        {isSelected ? (
                                            <ChevronDown className="w-4 h-4 shrink-0" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 shrink-0" />
                                        )}
                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-xs font-medium text-slate-600 shrink-0">
                                            {index + 1}
                                        </span>
                                        <span className="truncate flex-1">{step.title || `Step ${index + 1}`}</span>
                                        {commentCount > 0 && (
                                            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium shrink-0">
                                                {commentCount}
                                            </span>
                                        )}
                                    </button>

                                    {/* Comment Details */}
                                    {isSelected && (
                                        <div className="mt-2 ml-4 mr-2 mb-2 border-l-2 border-blue-200 pl-3">
                                            {isLoading ? (
                                                <div className="text-xs text-gray-500 py-2">読み込み中...</div>
                                            ) : stepComments.length > 0 ? (
                                                <div className="space-y-3">
                                                    {stepComments.map((comment) => (
                                                        <div key={comment.id} className="bg-gray-50 rounded-md p-3 text-xs">
                                                            <div className="flex items-start gap-2 mb-1">
                                                                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                                                    <User className="w-3 h-3 text-blue-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-baseline gap-2 mb-1">
                                                                        <span className="font-medium text-gray-900 text-xs">
                                                                            {comment.author_name}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-500">
                                                                            {formatDate(comment.created_at)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-gray-700 whitespace-pre-wrap break-words text-xs">
                                                                        {comment.content}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-500 py-2">コメントはありません</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
