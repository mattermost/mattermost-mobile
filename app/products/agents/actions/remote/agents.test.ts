// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchAIBots} from '@agents/actions/remote/bots';
import {rewriteStore} from '@agents/store';

import {fetchAgents} from './agents';

import type {LLMBot} from '@agents/types';

jest.mock('@agents/actions/remote/bots');

const serverUrl = 'https://test.mattermost.com';

beforeEach(() => {
    jest.clearAllMocks();
    rewriteStore.setAgents(serverUrl, []);
});

describe('fetchAgents', () => {
    it('should project /ai_bots results into the rewrite store, preserving isDefault', async () => {
        const bots = [
            {id: 'bot1', displayName: 'Matty', username: 'matty', isDefault: true, dmChannelID: 'dm1'},
            {id: 'bot2', displayName: 'Scout', username: 'scout', dmChannelID: 'dm2'},
        ] as LLMBot[];
        jest.mocked(fetchAIBots).mockResolvedValue({bots, searchEnabled: false, allowUnsafeLinks: false});

        const result = await fetchAgents(serverUrl);

        expect(result.error).toBeUndefined();
        expect(result.data).toEqual([
            {id: 'bot1', displayName: 'Matty', username: 'matty', isDefault: true},
            {id: 'bot2', displayName: 'Scout', username: 'scout', isDefault: undefined},
        ]);
        expect(rewriteStore.getAgents(serverUrl)).toHaveLength(2);
    });

    it('should propagate errors without touching the rewrite store', async () => {
        rewriteStore.setAgents(serverUrl, [{id: 'stale', displayName: 'Stale', username: 'stale'}]);
        jest.mocked(fetchAIBots).mockResolvedValue({error: new Error('boom')});

        const result = await fetchAgents(serverUrl);

        expect(result.error).toBeDefined();
        expect(rewriteStore.getAgents(serverUrl)).toHaveLength(1);
    });
});
