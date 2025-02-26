// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {dismissBottomSheet} from '@screens/navigation';
import {renderWithIntl} from '@test/intl-test-helper';
import {deleteDraftConfirmation} from '@utils/draft';
import {deleteScheduledPostConfirmation} from '@utils/scheduled_post';

import {DeleteDraft} from './delete_draft';

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

jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
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

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders draft delete option correctly', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
            websocketState: 'connected' as WebsocketConnectedState,
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        expect(screen.getByText('Delete draft')).toBeTruthy();
        expect(screen.getByTestId('delete_draft')).toBeTruthy();
    });

    it('renders scheduled post delete option correctly', () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
            postId: 'post-id',
            websocketState: 'connected' as WebsocketConnectedState,
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        expect(screen.getByText('Delete')).toBeTruthy();
        expect(screen.getByTestId('delete_draft')).toBeTruthy();
    });

    it('handles draft deletion correctly when connected', async () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
            websocketState: 'connected' as WebsocketConnectedState,
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

    it('handles draft deletion when not connected', async () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
            websocketState: 'not_connected' as WebsocketConnectedState,
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        const deleteButton = screen.getByTestId('delete_draft');
        fireEvent.press(deleteButton);

        expect(dismissBottomSheet).toHaveBeenCalledWith(Screens.DRAFT_SCHEDULED_POST_OPTIONS);
        expect(deleteDraftConfirmation).not.toHaveBeenCalled();
        expect(deleteScheduledPostConfirmation).not.toHaveBeenCalled();
    });

    it('handles scheduled post deletion correctly when connected', async () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
            postId: 'post-id',
            websocketState: 'connected' as WebsocketConnectedState,
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

    it('handles scheduled post deletion when not connected', async () => {
        const props = {
            ...baseProps,
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
            postId: 'post-id',
            websocketState: 'not_connected' as WebsocketConnectedState,
        };

        renderWithIntl(<DeleteDraft {...props}/>);

        const deleteButton = screen.getByTestId('delete_draft');
        fireEvent.press(deleteButton);

        expect(dismissBottomSheet).toHaveBeenCalledWith(Screens.DRAFT_SCHEDULED_POST_OPTIONS);
        expect(deleteScheduledPostConfirmation).not.toHaveBeenCalled();
        expect(deleteDraftConfirmation).not.toHaveBeenCalled();
    });
});
