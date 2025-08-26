// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PostPriorityType} from '@constants/post';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import QuickActions from './quick_actions';

describe('Quick Actions', () => {
    const baseProps: Parameters<typeof QuickActions>[0] = {
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
    };

    it('Should render slash command if canShowSlashCommands is true', () => {
        const props = {
            ...baseProps,
            canShowSlashCommands: true,
        };
        const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
        expect(queryByTestId('slash-input-action')).toBeDefined();
    });

    it('Should not render slash command if canShowSlashCommands is false', () => {
        const props = {
            ...baseProps,
            canShowSlashCommands: false,
        };
        const {queryByTestId} = renderWithIntlAndTheme(<QuickActions {...props}/>);
        expect(queryByTestId('slash-input-action')).toBeNull();
    });
});
