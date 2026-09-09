// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';

import customPromptsStore from '@agents/store/custom_prompts_store';

import type {CustomPrompt} from '@agents/types/api';

/**
 * Subscribe to the ephemeral custom prompts cache for a server. Callers are
 * responsible for triggering fetchCustomPrompts/fetchCustomPromptPins.
 */
export function useCustomPrompts(serverUrl: string): {prompts: CustomPrompt[]; pinnedIds: string[]} {
    const [prompts, setPrompts] = useState<CustomPrompt[]>(
        () => customPromptsStore.getPrompts(serverUrl),
    );
    const [pinnedIds, setPinnedIds] = useState<string[]>(
        () => customPromptsStore.getPinnedIds(serverUrl),
    );

    useEffect(() => {
        const promptsSubscription = customPromptsStore.observePrompts(serverUrl).subscribe(setPrompts);
        const pinsSubscription = customPromptsStore.observePinnedIds(serverUrl).subscribe(setPinnedIds);
        return () => {
            promptsSubscription.unsubscribe();
            pinsSubscription.unsubscribe();
        };
    }, [serverUrl]);

    return {prompts, pinnedIds};
}
