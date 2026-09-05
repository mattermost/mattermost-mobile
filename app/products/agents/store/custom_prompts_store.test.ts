// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {CustomPromptsState} from './custom_prompts_store';
import type {CustomPrompt} from '@agents/types/api';

const prompt: CustomPrompt = {
    id: 'prompt-1',
    creator_id: 'user-1',
    name: 'Standup update',
    description: '',
    template: 'Draft my standup update',
    is_shared: true,
    created_at: 1,
    updated_at: 1,
    deleted_at: 0,
};

describe('CustomPromptsStore', () => {
    let getCustomPromptsState: typeof import('./custom_prompts_store').getCustomPromptsState;
    let setCustomPromptsState: typeof import('./custom_prompts_store').setCustomPromptsState;
    let resetCustomPromptsState: typeof import('./custom_prompts_store').resetCustomPromptsState;
    let removeCustomPromptsServer: typeof import('./custom_prompts_store').removeCustomPromptsServer;
    let observeCustomPromptsState: typeof import('./custom_prompts_store').observeCustomPromptsState;

    beforeEach(() => {
        jest.resetModules();
        const store = require('./custom_prompts_store');
        getCustomPromptsState = store.getCustomPromptsState;
        setCustomPromptsState = store.setCustomPromptsState;
        resetCustomPromptsState = store.resetCustomPromptsState;
        removeCustomPromptsServer = store.removeCustomPromptsServer;
        observeCustomPromptsState = store.observeCustomPromptsState;
    });

    afterEach(() => {
        jest.resetModules();
    });

    it('should return default state for a new server URL', () => {
        expect(getCustomPromptsState('server1')).toEqual({prompts: [], pinnedPromptIds: []});
    });

    it('should merge partial updates and keep state per server', () => {
        setCustomPromptsState('server1', {prompts: [prompt]});
        setCustomPromptsState('server1', {pinnedPromptIds: ['prompt-1']});

        expect(getCustomPromptsState('server1')).toEqual({prompts: [prompt], pinnedPromptIds: ['prompt-1']});
        expect(getCustomPromptsState('server2')).toEqual({prompts: [], pinnedPromptIds: []});
    });

    it('should restore defaults on reset', () => {
        setCustomPromptsState('server1', {prompts: [prompt], pinnedPromptIds: ['prompt-1']});
        resetCustomPromptsState('server1');

        expect(getCustomPromptsState('server1')).toEqual({prompts: [], pinnedPromptIds: []});
    });

    it('should drop only the targeted server on removeServer and leave others intact', () => {
        setCustomPromptsState('server1', {prompts: [prompt], pinnedPromptIds: ['prompt-1']});
        setCustomPromptsState('server2', {pinnedPromptIds: ['prompt-2']});

        removeCustomPromptsServer('server1');

        expect(getCustomPromptsState('server1')).toEqual({prompts: [], pinnedPromptIds: []});
        expect(getCustomPromptsState('server2')).toEqual({prompts: [], pinnedPromptIds: ['prompt-2']});
    });

    it('should emit current state on subscribe and updates after set', () => {
        const received: CustomPromptsState[] = [];
        const subscription = observeCustomPromptsState('server1').subscribe((state) => {
            received.push(state);
        });

        setCustomPromptsState('server1', {pinnedPromptIds: ['prompt-1']});

        expect(received).toHaveLength(2);
        expect(received[0]).toEqual({prompts: [], pinnedPromptIds: []});
        expect(received[1]).toEqual({prompts: [], pinnedPromptIds: ['prompt-1']});

        subscription.unsubscribe();
    });
});
