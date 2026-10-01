// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';
import {Alert} from 'react-native';

import {clearConversationCacheForServer} from '@agents/actions/remote/conversation';
import {regenerateResponse} from '@agents/actions/remote/generation_controls';
import {handleAgentPostUpdate} from '@agents/actions/websocket';
import {CONTROL_SIGNALS} from '@agents/constants';
import streamingStore from '@agents/store/streaming_store';
import {BlockType, ToolCallStatusString, type ConversationResponse, type PostUpdateWebsocketMessage, type Turn} from '@agents/types';
import {Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';
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
jest.mock('@queries/servers/post', () => ({
    getPostById: jest.fn(async () => ({props: {conversation_id: 'conv1'}})),
}));
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

// Route events through the real websocket entry point: it owns the
// stream-end conversation refetch.
function sendPostUpdate(data: PostUpdateWebsocketMessage) {
    handleAgentPostUpdate('https://test.mattermost.com', {data} as WebSocketMessage<PostUpdateWebsocketMessage>);
}

async function flush(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

beforeEach(() => {
    jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue({database: {}} as ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>);
    streamingStore.removeServer('https://test.mattermost.com');
    clearConversationCacheForServer('https://test.mattermost.com');
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
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            await flush();
        });

        // While in precontent, the generating placeholder shows.
        expect(getByText('Generating response...')).toBeTruthy();

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, next: 'Hello from the bot'});
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
            sendPostUpdate({post_id: POST_ID, control: 'start'});
            await flush();
        });
        await act(async () => {
            sendPostUpdate({
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
            sendPostUpdate({post_id: POST_ID, control: 'end'});
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
            sendPostUpdate({post_id: POST_ID, control: 'start'});
            await flush();
        });
        await act(async () => {
            sendPostUpdate({
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
            sendPostUpdate({post_id: POST_ID, control: 'end'});
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

describe('AgentPostNew — multi-round rendering (A1)', () => {
    it('should render each assistant round so intermediate text/tools are not flattened away', async () => {
        // text -> tools (round 1) then final text (round 2). Flattening would
        // drop the intermediate 'Looking it up'.
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
                        {type: BlockType.Text, text: 'Looking it up'},
                        {type: BlockType.ToolUse, id: 'tu1', name: 'search_docs', input: {q: 'x'}, status: ToolCallStatusString.Success},
                    ],
                },
                {id: 't2', post_id: null, role: 'tool_result', sequence: 2, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.ToolResult, tool_use_id: 'tu1', content: 'res'}]},
                {id: 't3', post_id: POST_ID, role: 'assistant', sequence: 3, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'Final answer'}]},
            ],
        });
        mockFetchConversation.mockResolvedValue({data: conversation});

        const {findByText, getByText, getAllByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Final answer'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await findByText('Looking it up');

        // The round texts render as separate blocks in conversation order — a
        // regression that flattened or reordered the rounds would change this.
        const renderedText = getAllByTestId('mock-markdown').map((node) => node.props.children);
        expect(renderedText).toEqual(['Looking it up', 'Final answer']);

        // The tool from round 1 is attributed to its round, not dropped.
        expect(getByText('Search Docs')).toBeTruthy();
    });
});

describe('AgentPostNew — regenerate gating (C9 no_regen)', () => {
    const regenConversation = makeConversation({
        turns: [
            {id: 't1', post_id: POST_ID, role: 'assistant', sequence: 1, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'Answer'}]},
        ],
    });

    it('should show the regenerate button for the requester in a DM with content', async () => {
        mockFetchConversation.mockResolvedValue({data: regenConversation});

        const {findByText, queryByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Answer'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await findByText('Answer');
        expect(queryByTestId('agents.controls_bar.regenerate_button')).toBeTruthy();
    });

    it('should hide the regenerate button when the post is marked no_regen', async () => {
        mockFetchConversation.mockResolvedValue({data: regenConversation});

        const {findByText, queryByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Answer', props: {conversation_id: CONV_ID, no_regen: 'true'}})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await findByText('Answer');
        expect(queryByTestId('agents.controls_bar.regenerate_button')).toBeNull();
    });

    it('should hide the regenerate button when no_regen is the boolean true', async () => {
        mockFetchConversation.mockResolvedValue({data: regenConversation});

        const {findByText, queryByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Answer', props: {conversation_id: CONV_ID, no_regen: true}})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await findByText('Answer');
        expect(queryByTestId('agents.controls_bar.regenerate_button')).toBeNull();
    });

    it('should show the regenerate button when no_regen is the string "false"', async () => {
        mockFetchConversation.mockResolvedValue({data: regenConversation});

        const {findByText, queryByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Answer', props: {conversation_id: CONV_ID, no_regen: 'false'}})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await findByText('Answer');
        expect(queryByTestId('agents.controls_bar.regenerate_button')).toBeTruthy();
    });
});

describe('AgentPostNew — regenerate suppresses the stale answer (7a)', () => {
    jest.spyOn(Alert, 'alert');

    // The regenerate button opens a confirmation Alert; press its
    // destructive "Regenerate" option to run the actual handler.
    function confirmRegenerate() {
        const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2];
        buttons?.find((b) => b.text === 'Regenerate')?.onPress?.();
    }

    const oldConversation = makeConversation({
        turns: [
            {id: 't1', post_id: POST_ID, role: 'assistant', sequence: 1, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'Old answer'}]},
        ],
    });
    const newConversation = makeConversation({
        turns: [
            {id: 't2', post_id: POST_ID, role: 'assistant', sequence: 1, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'New answer'}]},
        ],
    });

    it('should hide the old persisted answer for the whole regeneration and clear the flag once the stream-end refetch lands', async () => {
        mockFetchConversation.mockResolvedValueOnce({data: oldConversation});
        mockFetchConversation.mockResolvedValueOnce({data: newConversation});

        const {findByText, getByText, getByTestId, queryByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Old answer'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await findByText('Old answer');

        // Tap regenerate: the stale answer disappears immediately and the
        // placeholder covers the gap until the new stream starts.
        await act(async () => {
            fireEvent.press(getByTestId('agents.controls_bar.regenerate_button'));
            confirmRegenerate();
            await flush();
        });
        expect(queryByText('Old answer')).toBeNull();
        expect(getByText('Generating response...')).toBeTruthy();

        // While the new stream runs, the old answer must not stack above it.
        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            sendPostUpdate({post_id: POST_ID, next: 'New answer streaming'});
            await flush();
        });
        expect(getByText('New answer streaming')).toBeTruthy();
        expect(queryByText('Old answer')).toBeNull();

        // Stream end → refetch delivers the regenerated turns → the flag
        // clears and the persisted new answer takes over cleanly.
        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.END});
            await flush();
        });
        expect(getByText('New answer')).toBeTruthy();
        expect(queryByText('Old answer')).toBeNull();
        expect(queryByText('New answer streaming')).toBeNull();
    });

    it('should restore the old answer when the regenerate request fails so the post is not left blank', async () => {
        mockFetchConversation.mockResolvedValue({data: oldConversation});
        jest.mocked(regenerateResponse).mockResolvedValueOnce({error: 'boom'});

        const {findByText, getByText, getByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Old answer'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await findByText('Old answer');

        await act(async () => {
            fireEvent.press(getByTestId('agents.controls_bar.regenerate_button'));
            confirmRegenerate();
            await flush();
        });

        expect(getByText('Old answer')).toBeTruthy();
    });
});

describe('AgentPostNew — cold-open loading placeholder (7c)', () => {
    it('should show the placeholder while the conversation fetch is in flight instead of a blank body', async () => {
        let resolveFetch: (value: {data: ConversationResponse}) => void = () => {};
        mockFetchConversation.mockReturnValue(new Promise((resolve) => {
            resolveFetch = resolve;
        }));

        const {findByText, getByText, queryByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Final answer'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        // Nothing is renderable yet — the placeholder fills the body.
        expect(getByText('Generating response...')).toBeTruthy();

        await act(async () => {
            resolveFetch({
                data: makeConversation({
                    turns: [
                        {id: 't1', post_id: POST_ID, role: 'assistant', sequence: 1, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'Final answer'}]},
                    ],
                }),
            });
            await flush();
        });

        expect(await findByText('Final answer')).toBeTruthy();
        expect(queryByText('Generating response...')).toBeNull();
    });
});

describe('AgentPostNew — stale cached conversation after a missed stream end', () => {
    it('should render the post message and refetch when the cached conversation lacks the response turns', async () => {
        const userTurn = {id: 't0', post_id: null, role: 'user' as const, sequence: 1, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'question'}]};
        let resolveRefetch: (value: {data: ConversationResponse}) => void = () => {};
        mockFetchConversation.
            mockResolvedValueOnce({data: makeConversation({turns: [userTurn]})}).
            mockReturnValueOnce(new Promise((resolve) => {
                resolveRefetch = resolve;
            }));

        const {findByText, getByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Summary text'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );
        await act(async () => {
            await flush();
        });

        expect(getByText('Summary text')).toBeTruthy();
        expect(mockFetchConversation).toHaveBeenCalledTimes(2);

        await act(async () => {
            resolveRefetch({
                data: makeConversation({
                    turns: [
                        userTurn,
                        {id: 't1', post_id: POST_ID, role: 'assistant', sequence: 2, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'Persisted summary'}]},
                    ],
                }),
            });
            await flush();
        });

        expect(await findByText('Persisted summary')).toBeTruthy();
        expect(mockFetchConversation).toHaveBeenCalledTimes(2);
    });
});

describe('AgentPostNew — response placeholder created before setup', () => {
    it('should show the setup progress on an empty response post until content streams', async () => {
        mockFetchConversation.mockResolvedValue({
            data: makeConversation({
                turns: [{id: 't0', post_id: null, role: 'user', sequence: 0, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text: 'question'}]}],
            }),
        });

        const {findByText, getByText, queryByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost()}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );
        await act(async () => {
            await flush();
        });

        // The conversation has no response turns yet, but the empty post is still working.
        expect(getByText('Generating response...')).toBeTruthy();

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.PROGRESS, progress_phase: 'connecting_provider', progress_seq: 4});
        });
        expect(getByText('Connecting to provider...')).toBeTruthy();

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            sendPostUpdate({post_id: POST_ID, next: 'First words'});
        });
        expect(await findByText('First words')).toBeTruthy();
        expect(queryByTestId('agents.post.working')).toBeNull();
    });
});

describe('AgentPostNew — provider server tools', () => {
    it('should render live provider activity alongside the streamed text', async () => {
        mockFetchConversation.mockResolvedValue({data: makeConversation()});

        const {findByTestId, findByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost()}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            sendPostUpdate({
                post_id: POST_ID,
                control: CONTROL_SIGNALS.SERVER_TOOL,
                server_tool: JSON.stringify([{id: 'srv1', tool: 'web_search', status: 'success', query: 'forecast'}]),
            });
            sendPostUpdate({post_id: POST_ID, next: 'Sunny all week'});
            await flush();
        });

        expect(await findByTestId('agents.server_tool.srv1')).toBeTruthy();
        expect(await findByText('Searched the web for "forecast"')).toBeTruthy();
        expect(await findByText('Sunny all week')).toBeTruthy();
    });
});

describe('AgentPostNew — streaming control (C5 continue, C6 stop guard)', () => {
    it('should clear live buffers and show the generating placeholder on a continue resume', async () => {
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

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            sendPostUpdate({post_id: POST_ID, next: 'first round text'});
            await flush();
        });
        expect(getByText('first round text')).toBeTruthy();

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.CONTINUE});
            await flush();
        });

        expect(queryByText('first round text')).toBeNull();
        expect(getByText('Generating response...')).toBeTruthy();
    });

    it('should ignore late streaming text after the user taps Stop', async () => {
        mockFetchConversation.mockResolvedValue({data: makeConversation()});

        const {getByText, getByTestId, queryByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost()}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            sendPostUpdate({post_id: POST_ID, next: 'partial answer'});
            await flush();
        });
        expect(getByText('partial answer')).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByTestId('agents.controls_bar.stop_button'));
            await flush();
        });

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, next: 'late text'});
            await flush();
        });

        expect(queryByText('late text')).toBeNull();
        expect(getByText('partial answer')).toBeTruthy();
    });
});

describe('AgentPostNew — combined Sources aggregation', () => {
    it('should keep distinct citations that lack a url rather than collapsing them by empty url', async () => {
        const conversation = makeConversation({
            turns: [
                {id: 't0', post_id: null, role: 'user', content: [], sequence: 0, tokens_in: 0, tokens_out: 0},
                {
                    id: 't1',
                    post_id: POST_ID,
                    role: 'assistant',
                    sequence: 1,
                    tokens_in: 0,
                    tokens_out: 0,
                    content: [{
                        type: BlockType.Text,
                        text: 'Answer',
                        citations: [
                            {type: 'url_citation', start_index: 0, end_index: 1, title: 'First source'},
                            {type: 'url_citation', start_index: 1, end_index: 2, title: 'Second source'},
                        ],
                    }],
                },
            ],
        });
        mockFetchConversation.mockResolvedValue({data: conversation});

        const {findByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Answer'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        // Both url-less citations survive; a strict dedup-by-url would have
        // collapsed them into a single 'Sources (1)'.
        expect(await findByText('Sources (2)')).toBeTruthy();
    });
});

describe('AgentPostNew — stream settle handover', () => {
    function deferred<T>() {
        let resolve!: (value: T) => void;
        const promise = new Promise<T>((res) => {
            resolve = res;
        });
        return {promise, resolve};
    }

    const textTurn = (id: string, sequence: number, text: string): Turn => ({
        id, post_id: POST_ID, role: 'assistant', sequence, tokens_in: 0, tokens_out: 0, content: [{type: BlockType.Text, text}],
    });

    it('should keep the streamed answer under the persisted prefix until the post-stream refetch lands', async () => {
        const settled = deferred<{data: ConversationResponse}>();
        mockFetchConversation.mockResolvedValueOnce({data: makeConversation({turns: [textTurn('t1', 1, 'Earlier round')]})});
        mockFetchConversation.mockReturnValueOnce(settled.promise);

        const {findByText, getByText, getAllByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Earlier round'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );
        await findByText('Earlier round');

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            sendPostUpdate({post_id: POST_ID, next: 'Fresh answer'});
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.END});
            await flush();
        });
        expect(getByText('Earlier round')).toBeTruthy();
        expect(getByText('Fresh answer')).toBeTruthy();

        await act(async () => {
            settled.resolve({data: makeConversation({turns: [textTurn('t1', 1, 'Earlier round'), textTurn('t2', 2, 'Fresh answer')]})});
            await flush();
        });
        expect(getAllByText('Fresh answer')).toHaveLength(1);
        expect(streamingStore.getStreamingState('https://test.mattermost.com', POST_ID)).toBeUndefined();
    });

    it('should not bring the old answer back when a fetch issued before regenerate lands late', async () => {
        const oldConversation = makeConversation({turns: [textTurn('t1', 1, 'Old answer')]});
        const lateFetch = deferred<{data: ConversationResponse}>();
        mockFetchConversation.mockResolvedValueOnce({data: oldConversation});
        mockFetchConversation.mockReturnValueOnce(lateFetch.promise);
        jest.spyOn(Alert, 'alert');

        const {findByText, getByTestId, queryByText} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: 'Old answer'})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );
        await findByText('Old answer');

        // The previous stream's end refetch is still in flight.
        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.END});
            await flush();
        });

        await act(async () => {
            fireEvent.press(getByTestId('agents.controls_bar.regenerate_button'));
            const buttons = jest.mocked(Alert.alert).mock.lastCall?.[2];
            buttons?.find((b) => b.text === 'Regenerate')?.onPress?.();
            await flush();
        });
        expect(queryByText('Old answer')).toBeNull();

        await act(async () => {
            lateFetch.resolve({data: makeConversation({turns: [textTurn('t1', 1, 'Old answer')]})});
            await flush();
        });
        expect(queryByText('Old answer')).toBeNull();
    });

    it('should let the requester act on a pending tool call while the stream is still live', async () => {
        mockFetchConversation.mockResolvedValue({data: makeConversation()});

        const {findByTestId} = renderWithIntlAndTheme(
            <AgentPostNew
                post={makePost({message: ''})}
                conversationId={CONV_ID}
                currentUserId={USER_ID}
                location={Screens.CHANNEL}
                isDM={true}
            />,
        );

        await act(async () => {
            sendPostUpdate({post_id: POST_ID, control: CONTROL_SIGNALS.START});
            sendPostUpdate({
                post_id: POST_ID,
                control: CONTROL_SIGNALS.TOOL_CALL,
                tool_call: JSON.stringify([{id: 'tu_live', name: 'search_docs', description: '', arguments: {q: 'x'}, status: 0}]),
            });
            await flush();
        });

        expect(await findByTestId('agents.tool_card.tu_live.approve')).toBeTruthy();
    });
});
