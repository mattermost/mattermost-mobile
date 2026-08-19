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

        it('should include tool_answers in the body when answers are provided', async () => {
            const toolAnswers = {
                'tool-1': {selected: ['Option A'], custom: 'my own idea'},
                'tool-2': {selected: ['Option B']},
            };
            await client.submitToolApproval('post-789', ['tool-1', 'tool-2'], toolAnswers);
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-789/tool_call',
                {
                    method: 'post',
                    body: {
                        accepted_tool_ids: ['tool-1', 'tool-2'],
                        tool_answers: toolAnswers,
                    },
                },
            );
        });

        it('should omit the tool_answers key when no answers are provided', async () => {
            await client.submitToolApproval('post-789', ['tool-1']);
            const body = mockDoFetch.mock.calls[0][1].body;
            expect('tool_answers' in body).toBe(false);
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

    describe('doChannelAnalysis', () => {
        it('should send since and team_id in the body without an unreads_only field', async () => {
            await client.doChannelAnalysis('channel-1', 'summarize_channel', 'ai-bot', {
                since: '2026-08-01T12:34:56.000Z',
                team_id: 'team-1',
                prompt: 'focus on decisions',
            });
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/channel/channel-1/analyze?botUsername=ai-bot',
                {
                    method: 'post',
                    body: {
                        analysis_type: 'summarize_channel',
                        since: '2026-08-01T12:34:56.000Z',
                        until: undefined,
                        days: undefined,
                        prompt: 'focus on decisions',
                        team_id: 'team-1',
                    },
                },
            );
            expect('unreads_only' in mockDoFetch.mock.calls[0][1].body).toBe(false);
        });
    });

    describe('doChannelInterval', () => {
        it('should post millisecond start time, a hard-coded end time of 0, and the preset with the bot username in the query', async () => {
            await client.doChannelInterval('channel-1', 1723000000000, 'summarize_unreads', 'ai-bot');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/channel/channel-1/interval?botUsername=ai-bot',
                {
                    method: 'post',
                    body: {
                        start_time: 1723000000000,
                        end_time: 0,
                        preset_prompt: 'summarize_unreads',
                        prompt: '',
                    },
                },
            );
        });

        it('should percent-encode a bot username that needs encoding', async () => {
            await client.doChannelInterval('channel-1', 1723000000000, 'action_items', 'my bot');
            expect(mockDoFetch.mock.calls[0][0]).toBe(
                '/plugins/mattermost-ai/channel/channel-1/interval?botUsername=my%20bot',
            );
        });
    });

    describe('doThreadAnalysis', () => {
        it('should post the analysis type in the body with the bot username in the query', async () => {
            await client.doThreadAnalysis('post-123', 'summarize_thread', 'ai-bot');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-123/analyze?botUsername=ai-bot',
                {
                    method: 'post',
                    body: {analysis_type: 'summarize_thread'},
                },
            );
        });

        it('should percent-encode a bot username that needs encoding', async () => {
            await client.doThreadAnalysis('post-123', 'action_items', 'my bot');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-123/analyze?botUsername=my%20bot',
                {
                    method: 'post',
                    body: {analysis_type: 'action_items'},
                },
            );
        });
    });

    describe('getConversation', () => {
        it('should make correct API call', async () => {
            await client.getConversation('conv-123');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/conversations/conv-123',
                {method: 'get'},
            );
        });
    });

    describe('getCustomPrompts', () => {
        it('should make correct API call', async () => {
            await client.getCustomPrompts();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/custom-prompts',
                {method: 'get'},
            );
        });
    });

    describe('getCustomPromptPins', () => {
        it('should make correct API call', async () => {
            await client.getCustomPromptPins();
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/custom-prompts/pins',
                {method: 'get'},
            );
        });
    });

    describe('renderCustomPrompt', () => {
        it('should post channel_id and bot_username in the body', async () => {
            await client.renderCustomPrompt('prompt-1', {channel_id: 'channel-1', bot_username: 'ai-bot'});
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/custom-prompts/prompt-1/render',
                {
                    method: 'post',
                    body: {channel_id: 'channel-1', bot_username: 'ai-bot'},
                },
            );
        });

        it('should percent-encode the prompt id in the path', async () => {
            await client.renderCustomPrompt('prompt/one', {});
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/custom-prompts/prompt%2Fone/render',
                {
                    method: 'post',
                    body: {channel_id: undefined, bot_username: undefined},
                },
            );
        });
    });

    describe('doLoopInAgent', () => {
        it('should make correct API call with the bot username in the query', async () => {
            await client.doLoopInAgent('post-123', 'ai-bot');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-123/loop_in_agent?botUsername=ai-bot',
                {method: 'post'},
            );
        });

        it('should percent-encode a bot username that needs encoding', async () => {
            await client.doLoopInAgent('post-123', 'my bot');
            expect(mockDoFetch).toHaveBeenCalledWith(
                '/plugins/mattermost-ai/post/post-123/loop_in_agent?botUsername=my%20bot',
                {method: 'post'},
            );
        });
    });
});
