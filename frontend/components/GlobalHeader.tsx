"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

export function GlobalHeader() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-white relative">
            <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Left: Brand Logo - Acts as "Back to Dashboard" */}
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                        <span className="text-sm font-bold text-primary-foreground">M</span>
                    </div>
                    <span className="text-xl font-semibold text-foreground">Manual AI</span>
                </Link>

                {/* Right: User Profile Avatar */}
                <div className="flex items-center">
                    <Button variant="ghost" size="sm" className="relative h-9 w-9 rounded-full">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src="/placeholder-user.jpg" alt="User" />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                                <User className="h-4 w-4" />
                            </AvatarFallback>
                        </Avatar>
                    </Button>
                </div>
            </div>
        </header>
    );
}
