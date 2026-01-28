// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ToolCallStatus, type ToolCall} from '@agents/types';
import React, {type ComponentProps} from 'react';

import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import ToolCard from './index';

// Mock Markdown component to avoid database dependency
jest.mock('@components/markdown', () => {
    const {Text} = require('react-native');
    const MockMarkdown = ({value}: {value: string}) => (
        <Text testID='mock-markdown'>{value}</Text>
    );
    return MockMarkdown;
});

describe('ToolCard', () => {
    const createMockTool = (overrides: Partial<ToolCall> = {}): ToolCall => ({
        id: 'tool-123',
        name: 'search_documents',
        description: 'Search through documents',
        arguments: {query: 'test query'},
        status: ToolCallStatus.Pending,
        ...overrides,
    });

    const getBaseProps = (): ComponentProps<typeof ToolCard> => ({
        tool: createMockTool(),
        isCollapsed: false,
        isProcessing: false,
        onToggleCollapse: jest.fn(),
        onApprove: jest.fn(),
        onReject: jest.fn(),
    });

    describe('tool name display', () => {
        it('should transform underscores to spaces and capitalize', () => {
            const props = getBaseProps();
            props.tool = createMockTool({name: 'search_documents'});
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Search Documents')).toBeTruthy();
        });

        it('should handle single word names', () => {
            const props = getBaseProps();
            props.tool = createMockTool({name: 'search'});
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Search')).toBeTruthy();
        });

        it('should handle multiple underscores', () => {
            const props = getBaseProps();
            props.tool = createMockTool({name: 'get_user_profile_data'});
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Get User Profile Data')).toBeTruthy();
        });
    });

    describe('status-based rendering', () => {
        it('should show loading indicator for pending status', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Pending});
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            // For pending status, the tool name should be visible (loading indicator is in header)
            expect(getByText('Search Documents')).toBeTruthy();
        });

        it('should show check icon for success status', () => {
            const props = getBaseProps();
            props.tool = createMockTool({
                status: ToolCallStatus.Success,
                result: 'Success result',
            });
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            // Response label should be visible for success
            expect(getByText('Response')).toBeTruthy();
        });

        it('should show error icon for error status', () => {
            const props = getBaseProps();
            props.tool = createMockTool({
                status: ToolCallStatus.Error,
                result: 'Error occurred',
            });
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            // Response label should be visible for error
            expect(getByText('Response')).toBeTruthy();
        });

        it('should show rejected status text for rejected status', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Rejected});
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Rejected')).toBeTruthy();
        });
    });

    describe('button visibility', () => {
        it('should show approve/reject buttons for pending without local decision', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Pending});
            props.localDecision = undefined;
            props.isProcessing = false;
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Accept')).toBeTruthy();
            expect(getByText('Reject')).toBeTruthy();
        });

        it('should hide buttons when local decision is made (approved)', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Pending});
            props.localDecision = true;
            const {queryByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(queryByText('Accept')).toBeNull();
            expect(queryByText('Reject')).toBeNull();
        });

        it('should hide buttons when local decision is made (rejected)', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Pending});
            props.localDecision = false;
            const {queryByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(queryByText('Accept')).toBeNull();
            expect(queryByText('Reject')).toBeNull();
        });

        it('should show processing text when pending and processing', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Pending});
            props.isProcessing = true;
            props.localDecision = undefined;
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Processing...')).toBeTruthy();
        });

        it('should hide buttons for non-pending status', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Success});
            const {queryByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(queryByText('Accept')).toBeNull();
            expect(queryByText('Reject')).toBeNull();
        });
    });

    describe('callbacks', () => {
        it('should call onToggleCollapse with tool id when header pressed', () => {
            const props = getBaseProps();
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            // Press on the tool name area (header)
            fireEvent.press(getByText('Search Documents'));
            expect(props.onToggleCollapse).toHaveBeenCalledWith('tool-123');
        });

        it('should call onApprove with tool id when Accept pressed', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Pending});
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            fireEvent.press(getByText('Accept'));
            expect(props.onApprove).toHaveBeenCalledWith('tool-123');
        });

        it('should call onReject with tool id when Reject pressed', () => {
            const props = getBaseProps();
            props.tool = createMockTool({status: ToolCallStatus.Pending});
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            fireEvent.press(getByText('Reject'));
            expect(props.onReject).toHaveBeenCalledWith('tool-123');
        });
    });

    describe('collapse state', () => {
        it('should show content when not collapsed', () => {
            const props = getBaseProps();
            props.isCollapsed = false;
            const {queryAllByTestId} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            // Mocked Markdown should be present when expanded
            expect(queryAllByTestId('mock-markdown').length).toBeGreaterThan(0);
        });

        it('should hide content when collapsed', () => {
            const props = getBaseProps();
            props.isCollapsed = true;
            const {queryAllByTestId} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            // Mocked Markdown should not be present when collapsed
            expect(queryAllByTestId('mock-markdown').length).toBe(0);
        });
    });

    describe('result rendering', () => {
        it('should show result for success status', () => {
            const props = getBaseProps();
            props.tool = createMockTool({
                status: ToolCallStatus.Success,
                result: 'Search completed successfully',
            });
            props.isCollapsed = false;
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Response')).toBeTruthy();
        });

        it('should show result for error status', () => {
            const props = getBaseProps();
            props.tool = createMockTool({
                status: ToolCallStatus.Error,
                result: 'An error occurred',
            });
            props.isCollapsed = false;
            const {getByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(getByText('Response')).toBeTruthy();
        });

        it('should not show result section when no result', () => {
            const props = getBaseProps();
            props.tool = createMockTool({
                status: ToolCallStatus.Success,
                result: undefined,
            });
            props.isCollapsed = false;
            const {queryByText} = renderWithIntlAndTheme(<ToolCard {...props}/>);

            expect(queryByText('Response')).toBeNull();
        });
    });
});
