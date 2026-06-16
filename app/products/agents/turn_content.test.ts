// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BlockType, ToolApprovalStage, ToolCallStatus, ToolCallStatusString, type ContentBlock, type ConversationResponse, type Turn} from '@agents/types';

import {
    anyToolHasArguments,
    anyToolHasResult,
    buildRoundsFromTurns,
    collectResponseTurns,
    deriveApprovalStageForPost,
    extractAnnotationsFromTurn,
    extractReasoningFromTurn,
    extractToolCallsForPost,
    statusStringToEnum,
} from './turn_content';

const POST_ID = 'anchorPost';

function makeTurn(partial: Partial<Turn> & {sequence: number; content: ContentBlock[]; role: Turn['role']}): Turn {
    return {
        id: `turn-${partial.sequence}`,
        post_id: null,
        tokens_in: 0,
        tokens_out: 0,
        ...partial,
    };
}

function makeConversation(turns: Turn[]): ConversationResponse {
    return {
        id: 'conv',
        user_id: 'userA',
        bot_id: 'bot',
        channel_id: null,
        root_post_id: null,
        title: '',
        operation: '',
        turns,
    };
}

describe('statusStringToEnum', () => {
    it.each<[string | undefined, ToolCallStatus]>([
        [ToolCallStatusString.Pending, ToolCallStatus.Pending],
        [ToolCallStatusString.Accepted, ToolCallStatus.Accepted],
        [ToolCallStatusString.Rejected, ToolCallStatus.Rejected],
        [ToolCallStatusString.Error, ToolCallStatus.Error],
        [ToolCallStatusString.Success, ToolCallStatus.Success],
        [ToolCallStatusString.AutoApproved, ToolCallStatus.AutoApproved],
    ])('should map %s to the numeric enum', (input, expected) => {
        expect(statusStringToEnum(input)).toBe(expected);
    });

    it('should default unknown values to Pending', () => {
        expect(statusStringToEnum(undefined)).toBe(ToolCallStatus.Pending);
        expect(statusStringToEnum('nonsense')).toBe(ToolCallStatus.Pending);
    });
});

describe('collectResponseTurns', () => {
    it('should return empty when no turn matches the post', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', post_id: 'other', content: []}),
        ]);
        expect(collectResponseTurns(conversation, POST_ID)).toEqual([]);
    });

    it('should walk backwards across tool-round turns until a user turn', () => {
        const toolUseBlock: ContentBlock = {type: BlockType.ToolUse, id: 't1', name: 'search'};
        const toolResultBlock: ContentBlock = {type: BlockType.ToolResult, tool_use_id: 't1', content: 'ok'};
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', content: [toolUseBlock]}),
            makeTurn({sequence: 2, role: 'tool_result', content: [toolResultBlock]}),
            makeTurn({sequence: 3, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'done'}]}),
        ]);

        const turns = collectResponseTurns(conversation, POST_ID);

        expect(turns.map((t) => t.sequence)).toEqual([1, 2, 3]);
    });

    it('should stop walking when encountering a turn anchored to a different post', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', post_id: 'priorPost', content: [{type: BlockType.Text, text: 'prior'}]}),
            makeTurn({sequence: 2, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'current'}]}),
        ]);

        const turns = collectResponseTurns(conversation, POST_ID);

        expect(turns.map((t) => t.sequence)).toEqual([2]);
    });

    it('should accept turns provided in arbitrary order', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 3, role: 'assistant', post_id: POST_ID, content: []}),
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', content: []}),
            makeTurn({sequence: 2, role: 'tool_result', content: []}),
        ]);

        const turns = collectResponseTurns(conversation, POST_ID);

        expect(turns.map((t) => t.sequence)).toEqual([1, 2, 3]);
    });

    it('should anchor on the highest-sequence assistant turn when multiple share post_id', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'stale'}]}),
            makeTurn({sequence: 2, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'fresh'}]}),
        ]);

        const turns = collectResponseTurns(conversation, POST_ID);

        expect(turns.map((t) => t.sequence)).toEqual([1, 2]);
    });
});

describe('extractToolCallsForPost', () => {
    it('should pair tool_use blocks with their matching tool_result by id', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                content: [{
                    type: BlockType.ToolUse,
                    id: 'call1',
                    name: 'search',
                    input: {q: 'hi'},
                    status: ToolCallStatusString.Success,
                }],
            }),
            makeTurn({
                sequence: 2,
                role: 'tool_result',
                content: [{type: BlockType.ToolResult, tool_use_id: 'call1', content: 'result text'}],
            }),
            makeTurn({sequence: 3, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: ''}]}),
        ]);

        const calls = extractToolCallsForPost(conversation, POST_ID);

        expect(calls).toHaveLength(1);
        expect(calls[0]).toMatchObject({
            id: 'call1',
            name: 'search',
            arguments: {q: 'hi'},
            result: 'result text',
            status: ToolCallStatus.Success,
        });
    });

    it('should find results that arrive in turns after the anchor', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                post_id: POST_ID,
                content: [{
                    type: BlockType.ToolUse,
                    id: 'call1',
                    name: 'search',
                    input: {q: 'hi'},
                    status: ToolCallStatusString.Pending,
                }],
            }),
            makeTurn({
                sequence: 2,
                role: 'tool_result',
                content: [{type: BlockType.ToolResult, tool_use_id: 'call1', content: 'late result'}],
            }),
        ]);

        const calls = extractToolCallsForPost(conversation, POST_ID);

        expect(calls).toHaveLength(1);
        expect(calls[0].result).toBe('late result');
    });

    it('should return empty arguments when the tool_use input is nulled by the server privacy filter', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                post_id: POST_ID,
                content: [{
                    type: BlockType.ToolUse,
                    id: 'call1',
                    name: 'search',
                    input: null,
                    status: ToolCallStatusString.Success,
                }],
            }),
        ]);

        const calls = extractToolCallsForPost(conversation, POST_ID);

        expect(calls).toHaveLength(1);
        expect(calls[0].arguments).toBeUndefined();
    });
});

describe('extractReasoningFromTurn', () => {
    it('should concatenate thinking blocks', () => {
        const turn = makeTurn({
            sequence: 1,
            role: 'assistant',
            content: [
                {type: BlockType.Thinking, text: 'first thought'},
                {type: BlockType.Thinking, text: 'second thought', signature: 'sig-2'},
                {type: BlockType.Text, text: 'visible'},
            ],
        });

        const result = extractReasoningFromTurn(turn);

        expect(result.summary).toBe('first thought\nsecond thought');
        expect(result.signature).toBe('sig-2');
    });

    it('should return empty when the turn has no thinking blocks', () => {
        const turn = makeTurn({sequence: 1, role: 'assistant', content: [{type: BlockType.Text, text: 'hi'}]});

        expect(extractReasoningFromTurn(turn)).toEqual({summary: '', signature: ''});
    });

    it('should tolerate an undefined turn', () => {
        expect(extractReasoningFromTurn(undefined)).toEqual({summary: '', signature: ''});
    });
});

describe('extractAnnotationsFromTurn', () => {
    it('should flatten citations across text blocks with a running index', () => {
        const turn = makeTurn({
            sequence: 1,
            role: 'assistant',
            content: [
                {
                    type: BlockType.Text,
                    text: 'a',
                    citations: [
                        {type: 'url', start_index: 0, end_index: 1, url: 'https://a', title: 'A'},
                    ],
                },
                {type: BlockType.Text, text: 'b'},
                {
                    type: BlockType.Text,
                    text: 'c',
                    citations: [
                        {type: 'url', start_index: 2, end_index: 3, url: 'https://c', title: 'C'},
                    ],
                },
            ],
        });

        const annotations = extractAnnotationsFromTurn(turn);

        expect(annotations).toHaveLength(2);
        expect(annotations.map((a) => a.index)).toEqual([0, 1]);
        expect(annotations[1]).toMatchObject({url: 'https://c', title: 'C'});
    });
});

// deriveApprovalStageForPost now reads the server-computed approval_state
// field on the post-anchor assistant turn. The server owns the state
// machine; these tests guard the pass-through and the fail-safe default.
describe('deriveApprovalStageForPost', () => {
    it('should return the server-set approval_state on the post anchor', () => {
        const conversation = makeConversation([
            makeTurn({
                sequence: 0,
                role: 'assistant',
                post_id: POST_ID,
                approval_state: 'result',
                content: [],
            }),
        ]);

        expect(deriveApprovalStageForPost(conversation, POST_ID)).toBe(ToolApprovalStage.Result);
    });

    it('should pass through the Call stage when server sets it', () => {
        const conversation = makeConversation([
            makeTurn({
                sequence: 0,
                role: 'assistant',
                post_id: POST_ID,
                approval_state: 'call',
                content: [],
            }),
        ]);

        expect(deriveApprovalStageForPost(conversation, POST_ID)).toBe(ToolApprovalStage.Call);
    });

    it('should default to Done when the anchor turn is missing', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
        ]);

        expect(deriveApprovalStageForPost(conversation, POST_ID)).toBe(ToolApprovalStage.Done);
    });

    it('should default to Done when approval_state is missing on the anchor', () => {
        const conversation = makeConversation([
            makeTurn({
                sequence: 0,
                role: 'assistant',
                post_id: POST_ID,
                content: [{type: BlockType.Text, text: 'hi'}],
            }),
        ]);

        expect(deriveApprovalStageForPost(conversation, POST_ID)).toBe(ToolApprovalStage.Done);
    });

    it('should read approval_state from the latest assistant anchor when multiple share post_id', () => {
        const conversation = makeConversation([
            makeTurn({
                sequence: 1,
                role: 'assistant',
                post_id: POST_ID,
                approval_state: 'call',
                content: [],
            }),
            makeTurn({
                sequence: 2,
                role: 'assistant',
                post_id: POST_ID,
                approval_state: 'done',
                content: [],
            }),
        ]);

        expect(deriveApprovalStageForPost(conversation, POST_ID)).toBe(ToolApprovalStage.Done);
    });
});

describe('buildRoundsFromTurns', () => {
    it('should return empty when no turn matches the post', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
        ]);

        expect(buildRoundsFromTurns(conversation, POST_ID)).toEqual([]);
    });

    it('should build one round per assistant turn in sequence order, separating text and tools', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                content: [
                    {type: BlockType.Text, text: 'Looking it up'},
                    {type: BlockType.ToolUse, id: 'call1', name: 'search', input: {q: 'hi'}, status: ToolCallStatusString.Success},
                ],
            }),
            makeTurn({
                sequence: 2,
                role: 'tool_result',
                content: [{type: BlockType.ToolResult, tool_use_id: 'call1', content: 'result text'}],
            }),
            makeTurn({sequence: 3, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'Done'}]}),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds).toHaveLength(2);
        expect(rounds[0].text).toBe('Looking it up');
        expect(rounds[0].toolCalls).toHaveLength(1);
        expect(rounds[0].toolCalls[0]).toMatchObject({id: 'call1', result: 'result text', status: ToolCallStatus.Success});
        expect(rounds[1].text).toBe('Done');
        expect(rounds[1].toolCalls).toHaveLength(0);
    });

    it('should skip non-assistant turns so round count equals the assistant-turn count', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', content: [{type: BlockType.ToolUse, id: 't1', name: 'x', status: ToolCallStatusString.Success}]}),
            makeTurn({sequence: 2, role: 'tool_result', content: [{type: BlockType.ToolResult, tool_use_id: 't1', content: 'ok'}]}),
            makeTurn({sequence: 3, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'final'}]}),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds).toHaveLength(2);
        expect(rounds.map((r) => r.id)).toEqual(['turn-1', 'turn-3']);
    });

    it('should attribute tools to their own round across multiple tool-bearing turns', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                content: [
                    {type: BlockType.Text, text: 'first'},
                    {type: BlockType.ToolUse, id: 'callA', name: 'search', status: ToolCallStatusString.Success},
                ],
            }),
            makeTurn({sequence: 2, role: 'tool_result', content: [{type: BlockType.ToolResult, tool_use_id: 'callA', content: 'resultA'}]}),
            makeTurn({
                sequence: 3,
                role: 'assistant',
                content: [
                    {type: BlockType.Text, text: 'second'},
                    {type: BlockType.ToolUse, id: 'callB', name: 'read', status: ToolCallStatusString.Success},
                ],
            }),
            makeTurn({sequence: 4, role: 'tool_result', content: [{type: BlockType.ToolResult, tool_use_id: 'callB', content: 'resultB'}]}),
            makeTurn({sequence: 5, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'final'}]}),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds).toHaveLength(3);
        expect(rounds.map((r) => r.text)).toEqual(['first', 'second', 'final']);
        expect(rounds[0].toolCalls.map((t) => t.id)).toEqual(['callA']);
        expect(rounds[0].toolCalls[0].result).toBe('resultA');
        expect(rounds[1].toolCalls.map((t) => t.id)).toEqual(['callB']);
        expect(rounds[1].toolCalls[0].result).toBe('resultB');
        expect(rounds[2].toolCalls).toHaveLength(0);
    });

    it('should attach reasoning to its own round rather than flattening onto the anchor', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                content: [
                    {type: BlockType.Thinking, text: 'early thought'},
                    {type: BlockType.ToolUse, id: 't1', name: 'x', status: ToolCallStatusString.Success},
                ],
            }),
            makeTurn({sequence: 2, role: 'tool_result', content: [{type: BlockType.ToolResult, tool_use_id: 't1', content: 'ok'}]}),
            makeTurn({sequence: 3, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'final'}]}),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds[0].reasoning.summary).toBe('early thought');
        expect(rounds[1].reasoning.summary).toBe('');
    });
});

describe('anyToolHasArguments / anyToolHasResult', () => {
    it('should return false for empty input', () => {
        expect(anyToolHasArguments([])).toBe(false);
        expect(anyToolHasResult([])).toBe(false);
    });

    it('should return true when at least one tool has arguments', () => {
        expect(anyToolHasArguments([
            {id: 'a', name: 'x', description: '', arguments: null, status: ToolCallStatus.Success},
            {id: 'b', name: 'y', description: '', arguments: {q: 1}, status: ToolCallStatus.Success},
        ])).toBe(true);
    });

    it('should return true when at least one tool has a result', () => {
        expect(anyToolHasResult([
            {id: 'a', name: 'x', description: '', arguments: {}, status: ToolCallStatus.Success},
            {id: 'b', name: 'y', description: '', arguments: {}, result: 'ok', status: ToolCallStatus.Success},
        ])).toBe(true);
    });
});
