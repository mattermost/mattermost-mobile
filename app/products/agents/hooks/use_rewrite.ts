// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {rewriteStore} from '@agents/store';
import {useCallback, useEffect, useRef, useState} from 'react';

import NetworkManager from '@managers/network_manager';
import {logWarning} from '@utils/log';

import type {RewriteAction} from '@agents/types';

const TIMEOUT_MS = 30000; // 30 seconds

type StartRewriteCallback = (
    serverUrl: string,
    message: string,
    action: RewriteAction,
    customPrompt: string | undefined,
    agentId: string | undefined,
    onSuccess: (rewrittenText: string) => void,
    onError: (error: string) => void,
) => void;

type UseRewriteReturn = {
    isProcessing: boolean;
    startRewrite: StartRewriteCallback;
    cancelRewrite: () => void;
};

/**
 * Hook that manages AI rewrite state across screens
 */
export const useRewrite = (): UseRewriteReturn => {
    const [isProcessing, setIsProcessing] = useState(rewriteStore.isRewriteProcessing());
    const currentPromiseRef = useRef<Promise<string> | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isCancelledRef = useRef(false);

    // Subscribe to rewrite store changes
    useEffect(() => {
        const subscription = rewriteStore.observeRewriteState().subscribe((state) => {
            setIsProcessing(state.isProcessing);
        });

        return () => subscription.unsubscribe();
    }, []);

    const cancelRewrite = useCallback(() => {
        isCancelledRef.current = true;
        currentPromiseRef.current = null;
        rewriteStore.setRewriteProcessing(false, '');

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    const startRewrite = useCallback((
        serverUrl: string,
        message: string,
        action: RewriteAction,
        customPrompt: string | undefined,
        agentId: string | undefined,
        onSuccess: (rewrittenText: string) => void,
        onError: (error: string) => void,
    ) => {
        if (rewriteStore.isRewriteProcessing()) {
            logWarning('[useRewrite] Rewrite already in progress');
            return;
        }

        rewriteStore.setRewriteProcessing(true, serverUrl);
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
                const rewritePromise = client.getRewrittenMessage(message, action, customPrompt, agentId);
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
                                logWarning('[useRewrite] Failed to parse JSON-encoded response, using raw:', e);
                            }
                        }

                        rewriteStore.setRewriteProcessing(false, '');
                        currentPromiseRef.current = null;
                        onSuccess(formattedResponse);
                    } else {
                        logWarning('[useRewrite] Invalid or empty response received:', response);
                        rewriteStore.setRewriteProcessing(false, '');
                        currentPromiseRef.current = null;
                        onError('Received an invalid response from AI. Please try again.');
                    }
                } else if (isCancelledRef.current) {
                    // Operation was cancelled, just cleanup
                    rewriteStore.setRewriteProcessing(false, '');
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
                    logWarning('[useRewrite] Error:', error);

                    let errorMsg = 'An error occurred while rewriting your message. Please try again.';
                    if (error instanceof Error && error.message === 'timeout') {
                        errorMsg = 'The AI request timed out. Please try again.';
                    }

                    rewriteStore.setRewriteProcessing(false, '');
                    currentPromiseRef.current = null;
                    onError(errorMsg);
                } else if (isCancelledRef.current) {
                    // Operation was cancelled, just cleanup
                    rewriteStore.setRewriteProcessing(false, '');
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
