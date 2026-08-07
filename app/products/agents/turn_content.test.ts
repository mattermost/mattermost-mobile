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
    statusStringToEnum,
    stripOpenAICitations,
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

    it('should collect only the highest-sequence anchor when multiple assistant turns share post_id', () => {
        // Regen paths that don't scrub prior response turns (e.g. thread
        // analysis) leave one anchored assistant turn per generation. Only the
        // newest generation may render or every prior answer stacks above it.
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'stale'}]}),
            makeTurn({sequence: 2, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'fresh'}]}),
        ]);

        const turns = collectResponseTurns(conversation, POST_ID);

        expect(turns.map((t) => t.sequence)).toEqual([2]);
    });

    it('should still collect unanchored tool-round turns between a superseded anchor and the current one', () => {
        // A superseded generation bounds the walk, but the current
        // generation's own tool rounds (written without a post_id) and a
        // demoted continuation anchor (post_id nulled) belong to the response.
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({sequence: 1, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'superseded'}]}),
            makeTurn({sequence: 2, role: 'assistant', content: [{type: BlockType.ToolUse, id: 't1', name: 'search'}]}),
            makeTurn({sequence: 3, role: 'tool_result', content: [{type: BlockType.ToolResult, tool_use_id: 't1', content: 'ok'}]}),
            makeTurn({sequence: 4, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'current'}]}),
        ]);

        const turns = collectResponseTurns(conversation, POST_ID);

        expect(turns.map((t) => t.sequence)).toEqual([2, 3, 4]);
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

    it('should extract url_citation annotations from an Annotations block web_search_context', () => {
        const turn = makeTurn({
            sequence: 1,
            role: 'assistant',
            content: [
                {type: BlockType.Text, text: 'answer'},
                {
                    type: BlockType.Annotations,
                    web_search_context: {
                        results: [
                            {type: 'url_citation', start_index: 0, end_index: 5, url: 'https://a', title: 'A', cited_text: 'quoted', index: 3},
                            {type: 'other_kind', url: 'https://ignored'},
                            {type: 'url_citation', url: 'https://b'},
                        ],
                        executed_queries: null,
                        count: 3,
                    },
                },
            ],
        });

        const annotations = extractAnnotationsFromTurn(turn);

        expect(annotations).toHaveLength(2);
        expect(annotations[0]).toEqual({
            type: 'url_citation',
            start_index: 0,
            end_index: 5,
            url: 'https://a',
            title: 'A',
            cited_text: 'quoted',
            index: 3,
        });

        // Missing indices default to 0 and the running index is preserved.
        expect(annotations[1]).toMatchObject({url: 'https://b', start_index: 0, end_index: 0, index: 1});
    });

    it('should ignore an Annotations block whose results are not an array', () => {
        const turn = makeTurn({
            sequence: 1,
            role: 'assistant',
            content: [
                {
                    type: BlockType.Annotations,
                    web_search_context: {results: {not: 'an array'}, executed_queries: null, count: 0},
                },
            ],
        });

        expect(extractAnnotationsFromTurn(turn)).toEqual([]);
    });
});

describe('stripOpenAICitations', () => {
    it('should remove inline (source: https://…) noise and tidy the space left before punctuation', () => {
        const input = 'The sky is blue (source: https://example.com/sky) .';

        expect(stripOpenAICitations(input)).toBe('The sky is blue.');
    });

    it('should leave text without citation noise unchanged', () => {
        const input = 'A normal sentence with a [link](https://example.com) in it.\nAnd a second line.';

        expect(stripOpenAICitations(input)).toBe(input);
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

    it('should pair a tool with a result that lands in a turn after the anchor', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                post_id: POST_ID,
                content: [{type: BlockType.ToolUse, id: 'call1', name: 'search', input: {q: 'hi'}, status: ToolCallStatusString.Pending}],
            }),
            makeTurn({sequence: 2, role: 'tool_result', content: [{type: BlockType.ToolResult, tool_use_id: 'call1', content: 'late result'}]}),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds).toHaveLength(1);
        expect(rounds[0].toolCalls).toHaveLength(1);
        expect(rounds[0].toolCalls[0].result).toBe('late result');
    });

    it('should carry the tool_use block metadata onto the tool call', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                post_id: POST_ID,
                content: [{
                    type: BlockType.ToolUse,
                    id: 'call1',
                    name: 'mattermost__read_post',
                    mcp_bare_name: 'read_post',
                    server_origin: 'https://mcp.example.com',
                    user_interaction: 'select',
                    would_auto_execute: true,
                    status: ToolCallStatusString.Pending,
                }],
            }),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds[0].toolCalls[0]).toMatchObject({
            id: 'call1',
            name: 'mattermost__read_post',
            mcp_bare_name: 'read_post',
            server_origin: 'https://mcp.example.com',
            user_interaction: 'select',
            would_auto_execute: true,
            decided: false,
        });
    });

    it('should mark a tool call decided when its result block records decided_at', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                post_id: POST_ID,
                content: [
                    {type: BlockType.ToolUse, id: 'decidedCall', name: 'search', status: ToolCallStatusString.Success},
                    {type: BlockType.ToolUse, id: 'undecidedCall', name: 'read', status: ToolCallStatusString.Success},
                ],
            }),
            makeTurn({
                sequence: 2,
                role: 'tool_result',
                content: [
                    {type: BlockType.ToolResult, tool_use_id: 'decidedCall', content: 'ok', decided_at: 1723000000000},
                    {type: BlockType.ToolResult, tool_use_id: 'undecidedCall', content: 'ok'},
                ],
            }),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds[0].toolCalls.map((t) => t.decided)).toEqual([true, false]);
    });

    it('should render only the latest generation when regens left multiple turns anchored to the post', () => {
        // Mirrors the server state after regenerating a thread-analysis post
        // twice: that regen path appends a new anchored assistant turn per
        // generation without scrubbing the previous ones. Only the newest
        // generation (text + its annotations) may render.
        const conversation = makeConversation([
            makeTurn({sequence: 1, role: 'user', content: [{type: BlockType.Text, text: 'analyze this thread'}]}),
            makeTurn({sequence: 2, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'gen1'}]}),
            makeTurn({
                sequence: 3,
                role: 'assistant',
                post_id: POST_ID,
                content: [
                    {type: BlockType.Text, text: 'gen2', citations: [{type: 'url', start_index: 0, end_index: 1, url: 'https://stale', title: 'Stale'}]},
                ],
            }),
            makeTurn({sequence: 4, role: 'assistant', post_id: POST_ID, content: [{type: BlockType.Text, text: 'gen3'}]}),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds).toHaveLength(1);
        expect(rounds[0].text).toBe('gen3');
        expect(rounds[0].annotations).toHaveLength(0);
    });

    it('should yield undefined arguments when the tool_use input was nulled by the privacy filter', () => {
        const conversation = makeConversation([
            makeTurn({sequence: 0, role: 'user', content: []}),
            makeTurn({
                sequence: 1,
                role: 'assistant',
                post_id: POST_ID,
                content: [{type: BlockType.ToolUse, id: 'call1', name: 'search', input: null, status: ToolCallStatusString.Success}],
            }),
        ]);

        const rounds = buildRoundsFromTurns(conversation, POST_ID);

        expect(rounds[0].toolCalls[0].arguments).toBeUndefined();
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
