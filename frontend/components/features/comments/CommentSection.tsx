"use client";

import React, { useState, useEffect } from 'react';
import { addComment, getComments, Comment } from '@/api/comment-api';
import { MessageCircle, Send, User, ChevronDown } from 'lucide-react';

interface CommentSectionProps {
    manualId: string;
    stepIndex: number;
    readOnly?: boolean;
}

export function CommentSection({ manualId, stepIndex, readOnly = false }: CommentSectionProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [content, setContent] = useState('');
    const [authorName, setAuthorName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    // コメントを読み込む
    useEffect(() => {
        loadComments();
    }, [manualId, stepIndex]);

    const loadComments = async () => {
        try {
            setIsLoading(true);
            const fetchedComments = await getComments(manualId, stepIndex);
            // Sort comments in descending order (newest first)
            const sortedComments = fetchedComments.sort((a, b) => {
                const timeA = a.created_at?._seconds || new Date(a.created_at).getTime() / 1000;
                const timeB = b.created_at?._seconds || new Date(b.created_at).getTime() / 1000;
                return timeB - timeA;
            });
            setComments(sortedComments);
        } catch (err) {
            console.error('Failed to load comments:', err);
            setComments([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!content.trim()) {
            setError('コメントを入力してください');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const displayName = authorName.trim() || '匿名';
            const newComment = await addComment(manualId, stepIndex, displayName, content.trim());
            setComments([...comments, newComment]);
            setContent('');
            setAuthorName('');
        } catch (err) {
            console.error('Failed to add comment:', err);
            setError('コメントの投稿に失敗しました');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';

        // Firestore timestamp の場合
        if (timestamp._seconds) {
            const date = new Date(timestamp._seconds * 1000);
            return date.toLocaleString('ja-JP', {
                year: 'numeric',
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
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return '';
        }
    };

    return (
        <div className="mt-8 border-t pt-6">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 mb-4 w-full text-left hover:opacity-70 transition-opacity"
            >
                <MessageCircle className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                    コメント ({comments.length})
                </h3>
                <ChevronDown
                    className={`w-5 h-5 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Collapsible Content */}
            {isOpen && (
                <>
                    {/* コメント一覧 */}
                    {isLoading ? (
                        <div className="text-gray-500 text-sm py-4">読み込み中...</div>
                    ) : comments.length > 0 && (
                        <div className="space-y-4 mb-6">
                            {comments.map((comment) => (
                                <div key={comment.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                            <User className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <span className="font-medium text-gray-900">{comment.author_name}</span>
                                                <span className="text-xs text-gray-500">
                                                    {formatDate(comment.created_at)}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* コメント投稿フォーム - 読み取り専用モードでは非表示 */}
                    {!readOnly && (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div>
                                <label htmlFor={`author-${stepIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                                    名前 (任意)
                                </label>
                                <input
                                    type="text"
                                    id={`author-${stepIndex}`}
                                    value={authorName}
                                    onChange={(e) => setAuthorName(e.target.value)}
                                    placeholder="匿名"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={isSubmitting}
                                    maxLength={50}
                                />
                            </div>
                            <div>
                                <label htmlFor={`content-${stepIndex}`} className="block text-sm font-medium text-gray-700 mb-1">
                                    コメント
                                </label>
                                <textarea
                                    id={`content-${stepIndex}`}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="コメントを入力してください"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    disabled={isSubmitting}
                                    maxLength={500}
                                />
                            </div>
                            {error && (
                                <div className="text-red-600 text-sm">{error}</div>
                            )}
                            <button
                                type="submit"
                                disabled={isSubmitting || !content.trim()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send className="w-4 h-4" />
                                {isSubmitting ? '投稿中...' : 'コメントを投稿'}
                            </button>
                        </form>
                    )}
                </>
            )}
        </div>
    );
}
