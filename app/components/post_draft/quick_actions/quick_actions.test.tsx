// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Screens} from '@constants';
import {PostPriorityType} from '@constants/post';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import QuickActions from './quick_actions';

jest.mock('@components/post_draft/quick_actions/bor_quick_action', () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe('Quick Actions', () => {
    const baseProps: Parameters<typeof QuickActions>[0] = {
        isBoREnabled: false,
        updatePostBoRStatus: jest.fn(),
        testID: 'test-quick-actions',
        canUploadFiles: true,
        fileCount: 0,
        isPostPriorityEnabled: true,
        canShowPostPriority: true,
        canShowSlashCommands: true,
        maxFileCount: 10,
        value: '',
        updateValue: jest.fn(),
        addFiles: jest.fn(),
        postPriority: {
            priority: PostPriorityType.STANDARD,
        },
        updatePostPriority: jest.fn(),
        focus: jest.fn(),
        location: Screens.CHANNEL,
    };

    describe('slash commands', () => {
        it('should render slash command if canShowSlashCommands is true', () => {
            const props = {
                ...baseProps,
                canShowSlashCommands: true,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.slash_input_action')).toBeDefined();
        });

        it('should not render slash command if canShowSlashCommands is false', () => {
            const props = {
                ...baseProps,
                canShowSlashCommands: false,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.slash_input_action')).toBeNull();
        });

        it('should render slash command by default when canShowSlashCommands is not provided', () => {
            const props = {
                ...baseProps,
            };
            delete (props as {canShowSlashCommands?: boolean}).canShowSlashCommands;
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.slash_input_action')).toBeDefined();
        });
    });

    describe('post priority', () => {
        it('should render post priority action when both isPostPriorityEnabled and canShowPostPriority are true', () => {
            const props = {
                ...baseProps,
                isPostPriorityEnabled: true,
                canShowPostPriority: true,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.post_priority_action')).toBeDefined();
        });

        it('should not render post priority action when isPostPriorityEnabled is false', () => {
            const props = {
                ...baseProps,
                isPostPriorityEnabled: false,
                canShowPostPriority: true,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.post_priority_action')).toBeNull();
        });

        it('should not render post priority action when canShowPostPriority is false', () => {
            const props = {
                ...baseProps,
                isPostPriorityEnabled: true,
                canShowPostPriority: false,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.post_priority_action')).toBeNull();
        });

        it('should not render post priority action when canShowPostPriority is undefined', () => {
            const props = {
                ...baseProps,
                isPostPriorityEnabled: true,
            };
            delete (props as {canShowPostPriority?: boolean}).canShowPostPriority;
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.post_priority_action')).toBeNull();
        });
    });

    describe('input action disabled states', () => {
        it('should disable at input action when value ends with @', () => {
            const props = {
                ...baseProps,
                value: 'test @',
            };
            const {getByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            const atAction = getByTestId('test-quick-actions.at_input_action.disabled');
            expect(atAction).toBeDisabled();
        });

        it('should enable at input action when value does not end with @', () => {
            const props = {
                ...baseProps,
                value: 'test message',
            };
            const {getByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            const atAction = getByTestId('test-quick-actions.at_input_action');
            expect(atAction).not.toBeDisabled();
        });

        it('should enable at input action when value is empty', () => {
            const props = {
                ...baseProps,
                value: '',
            };
            const {getByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            const atAction = getByTestId('test-quick-actions.at_input_action');
            expect(atAction).not.toBeDisabled();
        });

        it('should disable slash input action when value is not empty', () => {
            const props = {
                ...baseProps,
                value: 'test message',
            };
            const {getByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            const slashAction = getByTestId('test-quick-actions.slash_input_action.disabled');
            expect(slashAction).toBeDisabled();
        });

        it('should enable slash input action when value is empty', () => {
            const props = {
                ...baseProps,
                value: '',
            };
            const {getByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            const slashAction = getByTestId('test-quick-actions.slash_input_action');
            expect(slashAction).not.toBeDisabled();
        });
    });

    describe('attachment action props', () => {
        it('should pass disabled=true when canUploadFiles is false', () => {
            const props = {
                ...baseProps,
                canUploadFiles: false,
            };
            const {getByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            const attachmentAction = getByTestId('test-quick-actions.attachment_action.disabled');
            expect(attachmentAction).toBeDisabled();
        });

        it('should pass disabled=false when canUploadFiles is true', () => {
            const props = {
                ...baseProps,
                canUploadFiles: true,
            };
            const {getByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            const attachmentAction = getByTestId('test-quick-actions.attachment_action');
            expect(attachmentAction).not.toBeDisabled();
        });
    });

    describe('BoR quick action', () => {
        it('should render BoR action when isBoREnabled is true', () => {
            const props = {
                ...baseProps,
                isBoREnabled: true,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.bor_action')).toBeDefined();
        });

        it('should not render BoR action when isBoREnabled is false', () => {
            const props = {
                ...baseProps,
                isBoREnabled: false,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.bor_action')).toBeNull();
        });

        it('should not render BoR action in threads', () => {
            const props = {
                ...baseProps,
                isBoREnabled: true,
                location: Screens.THREAD,
            };
            const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
            expect(queryByTestId('test-quick-actions.bor_action')).toBeNull();
        });
    });

});
