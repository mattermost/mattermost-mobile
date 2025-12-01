// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useRef, useState} from 'react';

import NetworkManager from '@managers/network_manager';
import EphemeralStore from '@store/ephemeral_store';
import {logWarning} from '@utils/log';

import type {AIRewriteAction} from '@typings/api/ai';

const TIMEOUT_MS = 30000; // 30 seconds

type StartRewriteCallback = (
    serverUrl: string,
    message: string,
    action: AIRewriteAction,
    customPrompt: string | undefined,
    agentId: string | undefined,
    onSuccess: (rewrittenText: string) => void,
    onError: (error: string) => void,
) => void;

type UseAIRewriteReturn = {
    isProcessing: boolean;
    startRewrite: StartRewriteCallback;
    cancelRewrite: () => void;
};

// Hook that uses EphemeralStore for cross-screen state
export const useAIRewrite = (): UseAIRewriteReturn => {
    const [isProcessing, setIsProcessing] = useState(EphemeralStore.isAIRewriteProcessing());
    const currentPromiseRef = useRef<Promise<string> | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCancelledRef = useRef(false);

    // Subscribe to EphemeralStore changes
    useEffect(() => {
        const subscription = EphemeralStore.observeAIRewriteState().subscribe((state) => {
            setIsProcessing(state.isProcessing);
        });

        return () => subscription.unsubscribe();
    }, []);

    const cancelRewrite = useCallback(() => {
        isCancelledRef.current = true;
        currentPromiseRef.current = null;
        EphemeralStore.setAIRewriteProcessing(false, '');

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const startRewrite = useCallback((
        serverUrl: string,
        message: string,
        action: AIRewriteAction,
        customPrompt: string | undefined,
        agentId: string | undefined,
        onSuccess: (rewrittenText: string) => void,
        onError: (error: string) => void,
    ) => {
        if (EphemeralStore.isAIRewriteProcessing()) {
            logWarning('AI rewrite already in progress');
            return;
        }

        EphemeralStore.setAIRewriteProcessing(true, serverUrl);
        isCancelledRef.current = false;

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutRef.current = setTimeout(() => {
                reject(new Error('timeout'));
            }, TIMEOUT_MS);
        });

        const runRewrite = async () => {
            try {
                const client = NetworkManager.getClient(serverUrl);
                const rewritePromise = client.getAIRewrittenMessage(message, action, customPrompt, agentId);
                currentPromiseRef.current = rewritePromise;

                const response = await Promise.race([rewritePromise, timeoutPromise]);

                // Clear timeout if successful
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                // Check if this is still the current promise (not cancelled)
                if (currentPromiseRef.current === rewritePromise && !isCancelledRef.current) {
                    // Ensure response is a valid non-empty string
                    if (response && typeof response === 'string' && response.trim().length > 0) {
                        // If response is a JSON-encoded string, parse it to get actual newlines/escapes
                        let formattedResponse = response;
                        if (response.startsWith('"') && response.endsWith('"')) {
                            try {
                                formattedResponse = JSON.parse(response);
                            } catch (e) {
                                logWarning('Failed to parse JSON-encoded response, using raw:', e);
                            }
                        }

                        EphemeralStore.setAIRewriteProcessing(false, '');
                        currentPromiseRef.current = null;
                        onSuccess(formattedResponse);
                    } else {
                        logWarning('Invalid or empty AI response received:', response);
                        EphemeralStore.setAIRewriteProcessing(false, '');
                        currentPromiseRef.current = null;
                        onError('Received an invalid response from AI. Please try again.');
                    }
                } else if (isCancelledRef.current) {
                    // Operation was cancelled, just cleanup
                    EphemeralStore.setAIRewriteProcessing(false, '');
                    currentPromiseRef.current = null;
                }
            } catch (error) {
                // Clear timeout on error
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }

                // Only handle error if this is still the current promise and not cancelled
                if (currentPromiseRef.current && !isCancelledRef.current) {
                    logWarning('AI rewrite error:', error);

                    let errorMsg = 'An error occurred while rewriting your message. Please try again.';
                    if (error instanceof Error && error.message === 'timeout') {
                        errorMsg = 'The AI request timed out. Please try again.';
                    }

                    EphemeralStore.setAIRewriteProcessing(false, '');
                    currentPromiseRef.current = null;
                    onError(errorMsg);
                } else if (isCancelledRef.current) {
                    // Operation was cancelled, just cleanup
                    EphemeralStore.setAIRewriteProcessing(false, '');
                    currentPromiseRef.current = null;
                }
            }
        };

        runRewrite();
    }, []);

    return {
        isProcessing,
        startRewrite,
        cancelRewrite,
    };
};

// Re-export provider for backwards compatibility (but it's now a no-op)
export const AIRewriteProvider = ({children}: {children: React.ReactNode}) => {
    return children;
};
