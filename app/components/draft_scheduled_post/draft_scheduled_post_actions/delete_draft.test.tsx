// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '@constants/draft';
import {dismissBottomSheet} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import {deleteDraftConfirmation} from '@utils/draft';
import {deleteScheduledPostConfirmation} from '@utils/scheduled_post';

import DeleteDraft from './delete_draft';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'http://baseUrl.com'),
}));

jest.mock('@utils/draft', () => ({
    deleteDraftConfirmation: jest.fn(),
}));

jest.mock('@utils/scheduled_post', () => ({
    deleteScheduledPostConfirmation: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

describe('screens/draft_scheduled_post_options/DeleteDraft', () => {
    const baseProps = {
        bottomSheetId: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
        channelId: 'channel-id',
        rootId: 'root-id',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders draft delete option correctly', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_DRAFT,
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        expect(screen.getByText('Delete draft')).toBeTruthy();
        expect(screen.getByTestId('delete_draft')).toBeTruthy();
    });

    it('renders scheduled post delete option correctly', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            postId: 'post-id',
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        expect(screen.getByText('Delete')).toBeTruthy();
        expect(screen.getByTestId('delete_draft')).toBeTruthy();
    });

    it('handles draft deletion correctly', async () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_DRAFT,
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        const deleteButton = screen.getByTestId('delete_draft');
        fireEvent.press(deleteButton);

        expect(dismissBottomSheet).toHaveBeenCalledWith(Screens.DRAFT_SCHEDULED_POST_OPTIONS);
        await waitFor(() => expect(deleteDraftConfirmation).toHaveBeenCalledWith(expect.objectContaining({
            channelId: 'channel-id',
            rootId: 'root-id',
            serverUrl: 'http://baseUrl.com',
        })));
        expect(deleteScheduledPostConfirmation).not.toHaveBeenCalled();
    });

    it('handles scheduled post deletion correctly', async () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED,
            postId: 'post-id',
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        const deleteButton = screen.getByTestId('delete_draft');
        fireEvent.press(deleteButton);

        expect(dismissBottomSheet).toHaveBeenCalledWith(Screens.DRAFT_SCHEDULED_POST_OPTIONS);
        await waitFor(() => expect(deleteScheduledPostConfirmation).toHaveBeenCalledWith(expect.objectContaining({
            scheduledPostId: 'post-id',
        })));
        expect(deleteDraftConfirmation).not.toHaveBeenCalled();
    });
});
