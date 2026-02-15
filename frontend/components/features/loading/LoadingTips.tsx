"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const TIPS = [
    "Geminiは1秒ごとに動画解析をします。収録の際はゆっくり操作してください。",
    "アカウント未作成でも、デフォルトユーザーとしてログインできます。",
    "動画解析中はブラウザを閉じても問題ありません。",
    "ダッシュボードのタグは、マニュアルを共有したらshareに、停止したらprivateになります。"
];

interface LoadingTipsProps {
    className?: string;
}

export function LoadingTips({ className }: LoadingTipsProps) {
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
                setIsFading(false);
            }, 600);
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className={cn("text-center max-w-sm mx-auto min-h-[4rem] flex flex-col justify-center", className)}>
            <p
                className={cn(
                    "text-sm text-slate-600 leading-relaxed transition-all duration-700",
                    isFading ? "opacity-0 transform translate-y-1" : "opacity-100 transform translate-y-0"
                )}
            >
                {TIPS[currentTipIndex]}
            </p>
        </div>
    );
}
