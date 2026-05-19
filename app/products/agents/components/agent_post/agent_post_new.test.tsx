// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';

import {clearConversationCache} from '@agents/actions/remote/conversation';
import {CONTROL_SIGNALS} from '@agents/constants';
import streamingStore from '@agents/store/streaming_store';
import {BlockType, ToolCallStatusString, type ConversationResponse} from '@agents/types';
import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import AgentPostNew from './agent_post_new';

import type PostModel from '@typings/database/models/servers/post';

jest.mock('@components/markdown', () => {
    const {Text} = require('react-native');
    const MockMarkdown = ({value}: {value: string}) => (
        <Text testID='mock-markdown'>{value}</Text>
    );
    return MockMarkdown;
});

jest.mock('@context/server', () => ({
    useServerUrl: () => 'https://test.mattermost.com',
}));

const mockFetchConversation = jest.fn();
jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        getClient: jest.fn(() => ({
            getConversation: async (id: string) => {
                const res = await mockFetchConversation('https://test.mattermost.com', id);
                if (res?.error) {
                    throw new Error(res.error);
                }
                return res?.data;
            },
        })),
    },
}));
jest.mock('@actions/remote/session');
jest.mock('@utils/errors', () => ({
    getFullErrorMessage: jest.fn((err) => (err instanceof Error ? err.message : String(err))),
}));

jest.mock('@agents/actions/remote/generation_controls', () => ({
    regenerateResponse: jest.fn().mockResolvedValue({}),
    stopGeneration: jest.fn().mockResolvedValue({}),
}));
jest.mock('@agents/actions/remote/tool_approval', () => ({
    submitToolApproval: jest.fn().mockResolvedValue({}),
}));
jest.mock('@agents/actions/remote/tool_result', () => ({
    submitToolResult: jest.fn().mockResolvedValue({}),
}));

const POST_ID = 'post1';
const CONV_ID = 'conv1';
const USER_ID = 'userA';

function makePost(overrides: Partial<PostModel> = {}): PostModel {
    return TestHelper.fakePostModel({
        id: POST_ID,
        message: '',
        props: {conversation_id: CONV_ID},
        ...overrides,
    });
}

function makeConversation(overrides: Partial<ConversationResponse> = {}): ConversationResponse {
    return {
        id: CONV_ID,
        user_id: USER_ID,
        bot_id: 'bot',
        channel_id: null,
        root_post_id: POST_ID,
        title: '',
        operation: 'dm',
        turns: [],
        ...overrides,
    };
}

async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

beforeEach(() => {
    streamingStore.clear();
    clearConversationCache();
    mockFetchConversation.mockReset();
});

describe('AgentPostNew — streaming text (Bug #1)', () => {
    it('should render streaming text as it arrives over the wire', async () => {
        // Conversation fetch returns empty (no anchor turn yet since stream is active).
        mockFetchConversation.mockResolvedValue({data: makeConversation()});

        const {getByText, queryByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost()}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        // Simulate the plugin's websocket events in order.
        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {post_id: POST_ID, control: CONTROL_SIGNALS.START});
            await flush();
        });

        // While in precontent, the generating placeholder shows.
        expect(getByText('Generating response...')).toBeTruthy();

        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {post_id: POST_ID, next: 'Hello from the bot'});
            await flush();
        });

        // Streaming text renders, and the precontent placeholder is gone.
        expect(getByText('Hello from the bot')).toBeTruthy();
        expect(queryByText('Generating response...')).toBeNull();
    });
});

describe('AgentPostNew — old conversation tool calls (Bug #2)', () => {
    it('should render tool cards on the first mount when the conversation is already cached', async () => {
        // Realistic turn layout from the plugin: tool_use blocks are in a
        // turn BEFORE the anchor (post_id=null), and the anchor turn carries
        // only the final text.
        const conversation = makeConversation({
            turns: [
                {id: 't0', post_id: null, role: 'user', content: [], sequence: 0, tokens_in: 0, tokens_out: 0},
                {
                    id: 't1',
                    post_id: null,
                    role: 'assistant',
                    sequence: 1,
                    tokens_in: 0,
                    tokens_out: 0,
                    content: [
                        {
                            type: BlockType.ToolUse,
                            id: 'tu1',
                            name: 'search_docs',
                            input: {query: 'hi'},
                            status: ToolCallStatusString.Success,
                        },
                    ],
                },
                {
                    id: 't2',
                    post_id: null,
                    role: 'tool_result',
                    sequence: 2,
                    tokens_in: 0,
                    tokens_out: 0,
                    content: [
                        {type: BlockType.ToolResult, tool_use_id: 'tu1', content: 'result body', shared: true},
                    ],
                },
                {
                    id: 't3',
                    post_id: POST_ID,
                    role: 'assistant',
                    sequence: 3,
                    tokens_in: 0,
                    tokens_out: 0,
                    content: [
                        {type: BlockType.Text, text: 'Final response text'},
                    ],
                },
            ],
        });
        mockFetchConversation.mockResolvedValue({data: conversation});

        const {findByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Final response text'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        // The tool display name is title-cased. With a realistic turn layout
        // (tool_use blocks sit before the anchor turn), collectResponseTurns
        // must walk backwards through them.
        expect(await findByText('Search Docs')).toBeTruthy();
    });

    it('should still render tool cards on a stream-end transition when the invalidated fetch returns fresh turns', async () => {
        // Initial fetch: conversation has no anchor turn yet because the
        // stream has not ended.
        mockFetchConversation.mockResolvedValueOnce({data: makeConversation()});

        // After stream end we invalidate and re-fetch; now the anchor turn exists.
        const finalConversation = makeConversation({
            turns: [
                {id: 't0', post_id: null, role: 'user', content: [], sequence: 0, tokens_in: 0, tokens_out: 0},
                {
                    id: 't1',
                    post_id: null,
                    role: 'assistant',
                    sequence: 1,
                    tokens_in: 0,
                    tokens_out: 0,
                    content: [
                        {
                            type: BlockType.ToolUse,
                            id: 'tu1',
                            name: 'search_docs',
                            input: {query: 'hi'},
                            status: ToolCallStatusString.Success,
                        },
                    ],
                },
                {
                    id: 't3',
                    post_id: POST_ID,
                    role: 'assistant',
                    sequence: 2,
                    tokens_in: 0,
                    tokens_out: 0,
                    content: [{type: BlockType.Text, text: 'Done'}],
                },
            ],
        });
        mockFetchConversation.mockResolvedValueOnce({data: finalConversation});

        const {queryByText, findByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost()}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        // Kick off a stream, receive tool calls over the wire, then end.
        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {post_id: POST_ID, control: 'start'});
            await flush();
        });
        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {
                post_id: POST_ID,
                control: 'tool_call',
                tool_call: JSON.stringify([{
                    id: 'tu1',
                    name: 'search_docs',
                    description: '',
                    arguments: {query: 'hi'},
                    status: 4,
                }]),
            });
            await flush();
        });

        // Live rendering uses the streaming state — the tool card is visible.
        expect(await findByText('Search Docs')).toBeTruthy();

        // Now end the stream. Effect 3 invalidates, the re-fetch resolves with
        // the finalized turns, Effect 1 re-populates from the conversation.
        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {post_id: POST_ID, control: 'end'});
            await flush();
        });

        // Tool card still visible after the handoff.
        expect(queryByText('Search Docs')).toBeTruthy();
    });

    it('should render tool cards when conversation and turn both populate asynchronously', async () => {
        let resolveFetch: (value: {data: ConversationResponse}) => void = () => {};
        mockFetchConversation.mockReturnValue(new Promise((resolve) => {
            resolveFetch = resolve;
        }));

        const {queryByText, findByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Final response'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        // Before the fetch resolves, nothing tool-related is on screen.
        expect(queryByText('Search Docs')).toBeNull();

        await act(async () => {
            resolveFetch({
                data: makeConversation({
                    turns: [
                        {id: 't0', post_id: null, role: 'user', content: [], sequence: 0, tokens_in: 0, tokens_out: 0},
                        {
                            id: 't1',
                            post_id: POST_ID,
                            role: 'assistant',
                            sequence: 1,
                            tokens_in: 0,
                            tokens_out: 0,
                            content: [
                                {
                                    type: BlockType.ToolUse,
                                    id: 'tu1',
                                    name: 'search_docs',
                                    input: {query: 'hi'},
                                    status: ToolCallStatusString.Success,
                                },
                            ],
                        },
                    ],
                }),
            });
            await flush();
        });

        // Now tool cards render.
        expect(await findByText('Search Docs')).toBeTruthy();
    });

    it('should keep a single pending tool visible after streaming ends and POST_EDITED clears streamingState', async () => {
        // Channel scenario: agent streams a single pending tool, then the
        // stream ends awaiting approval. POST_EDITED races in and clears
        // streamingState. The invalidated conversation fetch resolves with
        // the finalized anchor turn that carries the pending tool_use block.
        const finalConversation = makeConversation({
            user_id: USER_ID,
            channel_id: 'channel1',
            turns: [
                {id: 't0', post_id: null, role: 'user', content: [], sequence: 0, tokens_in: 0, tokens_out: 0},
                {
                    id: 't1',
                    post_id: POST_ID,
                    role: 'assistant',
                    sequence: 1,
                    tokens_in: 0,
                    tokens_out: 0,
                    approval_state: 'call',
                    content: [
                        {
                            type: BlockType.ToolUse,
                            id: 'tu_pending',
                            name: 'get_channel_info',
                            input: {channel_id: 'abc'},
                            status: ToolCallStatusString.Pending,
                        },
                    ],
                },
            ],
        });

        // First fetch (at mount): empty conversation. Second fetch (after
        // stream end → invalidate): finalized conversation with anchor turn.
        mockFetchConversation.mockResolvedValueOnce({data: makeConversation()});
        mockFetchConversation.mockResolvedValueOnce({data: finalConversation});

        const {findByText, findByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: ''})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={false}
            />,
        );

        // Stream start + tool_call event (status 0 === Pending).
        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {post_id: POST_ID, control: 'start'});
            await flush();
        });
        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {
                post_id: POST_ID,
                control: 'tool_call',
                tool_call: JSON.stringify([{
                    id: 'tu_pending',
                    name: 'get_channel_info',
                    description: '',
                    arguments: {channel_id: 'abc'},
                    status: 0,
                }]),
            });
            await flush();
        });

        // Live rendering: tool visible with approve/reject.
        expect(await findByText('Get Channel Info')).toBeTruthy();

        // Stream ends awaiting approval.
        await act(async () => {
            streamingStore.handleWebSocketMessage('https://test.mattermost.com', {post_id: POST_ID, control: 'end'});
            await flush();
        });

        // POST_EDITED races in and clears the streaming state. This is what
        // handlePostEdited() does in posts.ts line 276.
        await act(async () => {
            streamingStore.removePost('https://test.mattermost.com', POST_ID);
            await flush();
        });

        // After the handoff the tool is still visible, and its approve/reject
        // buttons are still active so the user can act on the pending call.
        expect(await findByText('Get Channel Info')).toBeTruthy();
        expect(await findByTestId('agents.tool_card.tu_pending.approve')).toBeTruthy();
        expect(await findByTestId('agents.tool_card.tu_pending.reject')).toBeTruthy();
    });

    it('should render a single pending tool awaiting approval with approve/reject buttons', async () => {
        // Channel scenario: user sent a message, the agent's first (and only)
        // round emitted one pending tool_use block. No tool_result turn yet,
        // because execution is blocked on user approval. Server's
        // approval_state is 'call' on the anchor.
        const conversation = makeConversation({
            user_id: USER_ID,
            channel_id: 'channel1',
            turns: [
                {id: 't0', post_id: null, role: 'user', content: [], sequence: 0, tokens_in: 0, tokens_out: 0},
                {
                    id: 't1',
                    post_id: POST_ID,
                    role: 'assistant',
                    sequence: 1,
                    tokens_in: 0,
                    tokens_out: 0,
                    approval_state: 'call',
                    content: [
                        {
                            type: BlockType.ToolUse,
                            id: 'tu_pending',
                            name: 'get_channel_info',
                            input: {channel_id: 'abc'},
                            status: ToolCallStatusString.Pending,
                        },
                    ],
                },
            ],
        });
        mockFetchConversation.mockResolvedValue({data: conversation});

        const {findByText, findByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: ''})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={false}
            />,
        );

        expect(await findByText('Get Channel Info')).toBeTruthy();
        expect(await findByTestId('agents.tool_card.tu_pending.approve')).toBeTruthy();
        expect(await findByTestId('agents.tool_card.tu_pending.reject')).toBeTruthy();
    });
});
