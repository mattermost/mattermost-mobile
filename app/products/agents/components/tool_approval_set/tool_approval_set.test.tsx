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

        expect(submitToolApproval).toHaveBeenCalledWith('https://test.mattermost.com', 'p1', expect.arrayContaining(['a', 'b']));
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

        expect(submitToolApproval).toHaveBeenCalledWith('https://test.mattermost.com', 'p1', []);
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
