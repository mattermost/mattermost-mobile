// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';

import {submitToolApproval} from '@agents/actions/remote/tool_approval';
import {ToolApprovalStage, ToolCallStatus, type ToolCall} from '@agents/types';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ToolApprovalSet from './index';

// Mock Markdown so we can assert its rendered `value` prop directly.
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

jest.mock('@agents/actions/remote/tool_approval', () => ({
    submitToolApproval: jest.fn().mockResolvedValue({}),
}));

jest.mock('@agents/actions/remote/tool_result', () => ({
    submitToolResult: jest.fn().mockResolvedValue({}),
}));

function makeTool(overrides: Partial<ToolCall> = {}): ToolCall {
    return {
        id: 'tu1',
        name: 'search_docs',
        description: '',
        arguments: {query: 'test'},
        result: 'result body',
        status: ToolCallStatus.Success,
        ...overrides,
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ToolApprovalSet — tool card expansion (Bug #3)', () => {
    it('should show arguments markdown when a completed tool card is tapped open', () => {
        const tool = makeTool();

        const {getByText, queryByTestId, getAllByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={[tool]}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        // Completed (non-actionable) tools start collapsed, so the arguments
        // code block is not rendered.
        expect(queryByTestId('mock-markdown')).toBeNull();

        // Tap the tool name to expand.
        fireEvent.press(getByText('Search Docs'));

        const markdowns = getAllByTestId('mock-markdown');
        expect(markdowns).toHaveLength(2);
        const argumentsText = markdowns[0].props.children;
        expect(argumentsText).toContain('"query"');
        expect(argumentsText).toContain('"test"');
    });

    it('should collapse back when tapped a second time', () => {
        const tool = makeTool();

        const {getByText, queryAllByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={[tool]}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        // Expand
        fireEvent.press(getByText('Search Docs'));
        expect(queryAllByTestId('mock-markdown').length).toBeGreaterThan(0);

        // Collapse
        fireEvent.press(getByText('Search Docs'));
        expect(queryAllByTestId('mock-markdown').length).toBe(0);
    });

    it('should start expanded for pending tools that require user decision', () => {
        const tool = makeTool({status: ToolCallStatus.Pending, result: undefined});

        const {queryAllByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={[tool]}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        // Actionable (pending) tools default to expanded, so arguments are visible without a tap.
        expect(queryAllByTestId('mock-markdown').length).toBeGreaterThan(0);
    });

    it('should preserve natural tool order when mixing completed and pending tools', () => {
        const tools: ToolCall[] = [
            makeTool({id: 'a', name: 'first_tool', status: ToolCallStatus.Success}),
            makeTool({id: 'b', name: 'second_tool', status: ToolCallStatus.Pending, result: undefined}),
            makeTool({id: 'c', name: 'third_tool', status: ToolCallStatus.Success}),
        ];

        const {getAllByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={tools}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        // Tool name test IDs render in the array order — actionable tools must
        // not be hoisted above non-actionable ones.
        const names = getAllByTestId(/agents\.tool_card\.[abc]\.name$/);
        expect(names.map((n) => n.props.testID)).toEqual([
            'agents.tool_card.a.name',
            'agents.tool_card.b.name',
            'agents.tool_card.c.name',
        ]);
    });

    it('should render approve/reject buttons for pending tools in the Call stage', () => {
        const tool = makeTool({status: ToolCallStatus.Pending, result: undefined});

        const {getByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={[tool]}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        expect(getByTestId('agents.tool_card.tu1.approve')).toBeTruthy();
        expect(getByTestId('agents.tool_card.tu1.reject')).toBeTruthy();
    });
});

describe('ToolApprovalSet — batch decisions (B10) and canApprove gating (C1)', () => {
    const pendingTools: ToolCall[] = [
        makeTool({id: 'a', name: 'first_tool', status: ToolCallStatus.Pending, result: undefined}),
        makeTool({id: 'b', name: 'second_tool', status: ToolCallStatus.Pending, result: undefined}),
    ];

    it('should accept every actionable tool in one tap', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={pendingTools}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        await act(async () => {
            fireEvent.press(getByTestId('agents.tool_approval_set.accept_all'));
        });

        expect(submitToolApproval).toHaveBeenCalledWith('https://test.mattermost.com', 'p1', ['a', 'b'], undefined);
    });

    it('should reject every actionable tool with an empty approved list', async () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={pendingTools}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        await act(async () => {
            fireEvent.press(getByTestId('agents.tool_approval_set.reject_all'));
        });

        expect(submitToolApproval).toHaveBeenCalledWith('https://test.mattermost.com', 'p1', [], undefined);
    });

    it('should hide auto-approved-policy calls from cards and exclude them from the decision count in a mixed batch', () => {
        const tools: ToolCall[] = [
            makeTool({id: 'a', name: 'first_tool', status: ToolCallStatus.Pending, result: undefined}),
            makeTool({id: 'b', name: 'auto_tool', status: ToolCallStatus.Pending, result: undefined, would_auto_execute: true}),
            makeTool({id: 'c', name: 'third_tool', status: ToolCallStatus.Pending, result: undefined}),
        ];

        const {getByText, getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={tools}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        // The policy-approved call renders no card at all in a mixed batch and
        // never gets approval controls (the server runs it on resume).
        expect(queryByTestId('agents.tool_card.b')).toBeNull();
        expect(queryByTestId('agents.tool_card.b.approve')).toBeNull();

        // Only the two manual calls count as pending decisions.
        expect(getByText('2 tools need decisions')).toBeTruthy();
        expect(getByTestId('agents.tool_card.a.approve')).toBeTruthy();
        expect(getByTestId('agents.tool_card.c.approve')).toBeTruthy();
    });

    it('should show a single Run tools button that submits an empty accepted list for an interrupted all-auto round', async () => {
        const tools: ToolCall[] = [
            makeTool({id: 'a', name: 'first_tool', status: ToolCallStatus.Pending, result: undefined, would_auto_execute: true}),
            makeTool({id: 'b', name: 'second_tool', status: ToolCallStatus.Pending, result: undefined, would_auto_execute: true}),
        ];

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={tools}
                approvalStage={ToolApprovalStage.Call}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        // Cards stay visible in an interrupted all-auto round, but no per-tool
        // or batch approval controls are offered.
        expect(getByTestId('agents.tool_card.a')).toBeTruthy();
        expect(queryByTestId('agents.tool_card.a.approve')).toBeNull();
        expect(queryByTestId('agents.tool_approval_set.pending_decisions')).toBeNull();

        await act(async () => {
            fireEvent.press(getByTestId('agents.tool_approval_set.run_tools'));
        });

        // The server re-checks the auto-execution policy itself; no ids are accepted.
        expect(submitToolApproval).toHaveBeenCalledWith('https://test.mattermost.com', 'p1', [], undefined);
    });

    it('should not re-prompt share/keep-private for results that were already decided server-side', () => {
        const tools: ToolCall[] = [
            makeTool({id: 'd1', name: 'first_tool', status: ToolCallStatus.Success, decided: true}),
            makeTool({id: 'd2', name: 'second_tool', status: ToolCallStatus.Success}),
        ];

        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={tools}
                approvalStage={ToolApprovalStage.Result}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        expect(queryByTestId('agents.tool_card.d1.share')).toBeNull();
        expect(queryByTestId('agents.tool_card.d1.keep_private')).toBeNull();
        expect(getByTestId('agents.tool_card.d2.share')).toBeTruthy();
        expect(getByTestId('agents.tool_card.d2.keep_private')).toBeTruthy();
    });

    it('should suppress the status bar and per-card buttons for a viewer who cannot approve', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={pendingTools}
                approvalStage={ToolApprovalStage.Call}
                canApprove={false}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );

        expect(queryByTestId('agents.tool_approval_set.pending_decisions')).toBeNull();
        expect(queryByTestId('agents.tool_approval_set.accept_all')).toBeNull();
        expect(queryByTestId('agents.tool_card.a.approve')).toBeNull();
        expect(queryByTestId('agents.tool_card.b.approve')).toBeNull();
    });
});

describe('ToolApprovalSet — question cards (AskUserQuestion)', () => {
    function makeQuestionTool(overrides: Partial<ToolCall> = {}): ToolCall {
        return makeTool({
            id: 'q1',
            name: 'AskUserQuestion',
            user_interaction: 'select',
            status: ToolCallStatus.Pending,
            result: undefined,
            arguments: {
                question: 'Which approach?',
                options: [{label: 'Option A'}, {label: 'Option B'}],
            },
            ...overrides,
        });
    }

    function renderSet(toolCalls: ToolCall[], approvalStage: ToolApprovalStage = ToolApprovalStage.Call) {
        return renderWithIntlAndTheme(
            <ToolApprovalSet
                postId='p1'
                toolCalls={toolCalls}
                approvalStage={approvalStage}
                canApprove={true}
                canExpand={true}
                showArguments={true}
                showResults={true}
            />,
        );
    }

    it('should submit a single-select answer immediately on option tap', async () => {
        const {getByTestId} = renderSet([makeQuestionTool()]);

        await act(async () => {
            fireEvent.press(getByTestId('agents.question_card.q1.option.0'));
        });

        expect(submitToolApproval).toHaveBeenCalledWith(
            'https://test.mattermost.com', 'p1', ['q1'], {q1: {selected: ['Option A']}},
        );
    });

    it('should require an explicit Submit for multi-select and send every selected label', async () => {
        const tool = makeQuestionTool({
            arguments: {
                question: 'Pick all that apply',
                options: [{label: 'Option A'}, {label: 'Option B'}],
                multi_select: true,
            },
        });
        const {getByTestId} = renderSet([tool]);

        fireEvent.press(getByTestId('agents.question_card.q1.option.0'));
        fireEvent.press(getByTestId('agents.question_card.q1.option.1'));
        expect(submitToolApproval).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.press(getByTestId('agents.question_card.q1.submit'));
        });

        expect(submitToolApproval).toHaveBeenCalledWith(
            'https://test.mattermost.com', 'p1', ['q1'], {q1: {selected: ['Option A', 'Option B']}},
        );
    });

    it('should expand the free-form input in place and submit the typed text as custom', async () => {
        const {getByTestId, queryByTestId} = renderSet([makeQuestionTool()]);

        expect(queryByTestId('agents.question_card.q1.free_form.input')).toBeNull();
        fireEvent.press(getByTestId('agents.question_card.q1.free_form'));

        fireEvent.changeText(getByTestId('agents.question_card.q1.free_form.input'), 'my own idea');
        expect(submitToolApproval).not.toHaveBeenCalled();

        await act(async () => {
            fireEvent.press(getByTestId('agents.question_card.q1.submit'));
        });

        expect(submitToolApproval).toHaveBeenCalledWith(
            'https://test.mattermost.com', 'p1', ['q1'], {q1: {selected: [], custom: 'my own idea'}},
        );
    });

    it('should not offer a free-form option when allow_free_form is false', () => {
        const tool = makeQuestionTool({
            arguments: {
                question: 'Which approach?',
                options: [{label: 'Option A'}, {label: 'Option B'}],
                allow_free_form: false,
            },
        });
        const {getByTestId, queryByTestId} = renderSet([tool]);

        expect(getByTestId('agents.question_card.q1.option.0')).toBeTruthy();
        expect(queryByTestId('agents.question_card.q1.free_form')).toBeNull();
    });

    it('should reject the tool with no answer when the question is skipped', async () => {
        const {getByTestId} = renderSet([makeQuestionTool()]);

        await act(async () => {
            fireEvent.press(getByTestId('agents.question_card.q1.skip'));
        });

        expect(submitToolApproval).toHaveBeenCalledWith('https://test.mattermost.com', 'p1', [], undefined);
    });

    it('should fall back to the generic tool card when arguments are redacted', () => {
        const tool = makeQuestionTool({arguments: null});
        const {getByTestId, queryByTestId} = renderSet([tool]);

        expect(queryByTestId('agents.question_card.q1')).toBeNull();
        expect(getByTestId('agents.tool_card.q1')).toBeTruthy();
    });

    it('should render the recorded answer as a non-interactive Answered state', () => {
        const tool = makeQuestionTool({
            status: ToolCallStatus.Success,
            result: '{"selected":["Option B"],"custom":""}',
        });
        const {getByTestId, queryByTestId} = renderSet([tool], ToolApprovalStage.Done);

        expect(getByTestId('agents.question_card.q1.status.answered')).toBeTruthy();
        expect(getByTestId('agents.question_card.q1.option.1')).toBeTruthy();
        expect(queryByTestId('agents.question_card.q1.skip')).toBeNull();
        expect(queryByTestId('agents.question_card.q1.submit')).toBeNull();
    });
});
