// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import clientAgents from './rest';

describe('ClientAgents', () => {
    const mockDoFetch = jest.fn();

    const BaseClass = class {
        doFetch = mockDoFetch;
    };
    const Client = clientAgents(BaseClass);
    const client = new Client();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAgentsRoute', () => {
        it('should return the correct route', () => {
            expect(client.getAgentsRoute()).toBe('/plugins/mattermost-ai');
        });
    });

    describe('getAIBots', () => {
        it('should make correct API call', async () => {
            await client.getAIBots();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/ai_bots',
                {method: 'get'},
            );
        });
    });

    describe('getAIThreads', () => {
        it('should make correct API call', async () => {
            await client.getAIThreads();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/ai_threads',
                {method: 'get'},
            );
        });
    });

    describe('stopGeneration', () => {
        it('should make correct API call', async () => {
            await client.stopGeneration('post-123');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-123/stop',
                {method: 'post'},
            );
        });
    });

    describe('regenerateResponse', () => {
        it('should make correct API call', async () => {
            await client.regenerateResponse('post-456');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-456/regenerate',
                {method: 'post'},
            );
        });
    });

    describe('submitToolApproval', () => {
        it('should make correct API call with accepted tool IDs', async () => {
            const acceptedToolIds = ['tool-1', 'tool-2'];
            await client.submitToolApproval('post-789', acceptedToolIds);
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-789/tool_call',
                {
                    method: 'post',
                    body: {accepted_tool_ids: acceptedToolIds},
                },
            );
        });

        it('should make correct API call with empty tool IDs', async () => {
            await client.submitToolApproval('post-789', []);
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-789/tool_call',
                {
                    method: 'post',
                    body: {accepted_tool_ids: []},
                },
            );
        });
    });
});
