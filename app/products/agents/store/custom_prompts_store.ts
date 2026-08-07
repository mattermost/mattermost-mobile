// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject} from 'rxjs';

import type {CustomPrompt} from '@agents/types/api';

// Ephemeral, in-memory only: custom prompts are consumed (not authored) on
// mobile, so they are refetched when a surface mounts rather than persisted.
export type CustomPromptsState = {
    prompts: CustomPrompt[];
    pinnedPromptIds: string[];
};

const DefaultCustomPromptsState: CustomPromptsState = {
    prompts: [],
    pinnedPromptIds: [],
};

const customPromptsSubjects: Dictionary<BehaviorSubject<CustomPromptsState>> = {};

const getCustomPromptsSubject = (serverUrl: string) => {
    if (!customPromptsSubjects[serverUrl]) {
        customPromptsSubjects[serverUrl] = new BehaviorSubject(DefaultCustomPromptsState);
    }

    return customPromptsSubjects[serverUrl];
};

export const getCustomPromptsState = (serverUrl: string) => {
    return getCustomPromptsSubject(serverUrl).value;
};

export const setCustomPromptsState = (serverUrl: string, state: Partial<CustomPromptsState>) => {
    const subject = getCustomPromptsSubject(serverUrl);
    subject.next({...subject.value, ...state});
};

export const resetCustomPromptsState = (serverUrl: string) => {
    getCustomPromptsSubject(serverUrl).next(DefaultCustomPromptsState);
};

export const observeCustomPromptsState = (serverUrl: string) => {
    return getCustomPromptsSubject(serverUrl).asObservable();
};

export const useCustomPromptsState = (serverUrl: string) => {
    const [state, setState] = useState(DefaultCustomPromptsState);

    const customPromptsSubject = getCustomPromptsSubject(serverUrl);

    useEffect(() => {
        const subscription = customPromptsSubject.subscribe((customPromptsState) => {
            setState(customPromptsState);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [customPromptsSubject]);

    return state;
};
