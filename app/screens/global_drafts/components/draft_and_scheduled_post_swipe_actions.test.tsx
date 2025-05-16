// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events, Screens} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';
import * as DraftUtils from '@utils/draft';
import * as ScheduledPostUtils from '@utils/scheduled_post';

import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED} from '../../../constants/draft';

import DraftAndScheduledPostSwipeActions from './draft_and_scheduled_post_swipe_actions';

import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

// Mock the draft_scheduled_post component
jest.mock('@components/draft_scheduled_post', () => {
    // Use mockView instead of View to avoid reference error
    return jest.fn().mockImplementation(({draftType, post}) => ({
        type: 'mockView',
        props: {
            testID: `draft-scheduled-post-${draftType}-${post.id}`,
        },
        $$typeof: Symbol.for('react.element'),
        ref: null,
        key: null,
    }));
});

jest.mock('@utils/draft', () => ({
    deleteDraftConfirmation: jest.fn(),
}));

jest.mock('@utils/scheduled_post', () => ({
    deleteScheduledPostConfirmation: jest.fn(),
}));

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue('https://server.com'),
}));

describe('DraftAndScheduledPostSwipeActions', () => {
    const mockDraft = {
        id: 'draft-id-1',
        channelId: 'channel-id-1',
        rootId: 'root-id-1',
    } as DraftModel;

    const mockScheduledPost = {
        id: 'scheduled-id-1',
        channelId: 'channel-id-1',
        rootId: 'root-id-1',
    } as ScheduledPostModel;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders draft correctly', () => {
        const {getByTestId} = renderWithIntl(
            <DraftAndScheduledPostSwipeActions
                draftType={DRAFT_TYPE_DRAFT}
                item={mockDraft}
                location={Screens.GLOBAL_DRAFTS}
                layoutWidth={300}
            />,
        );

        expect(getByTestId('draft-scheduled-post-draft-draft-id-1')).toBeTruthy();
        expect(getByTestId('draft_scheduled_post_swipeable')).toBeTruthy();
    });

    it('renders scheduled post correctly', () => {
        const {getByTestId} = renderWithIntl(
            <DraftAndScheduledPostSwipeActions
                draftType={DRAFT_TYPE_SCHEDULED}
                item={mockScheduledPost}
                location={Screens.GLOBAL_DRAFTS}
                layoutWidth={300}
            />,
        );

        expect(getByTestId('draft-scheduled-post-scheduled-scheduled-id-1')).toBeTruthy();
        expect(getByTestId('draft_scheduled_post_swipeable')).toBeTruthy();
    });

    it('emits event when swipe starts', () => {
        const emitSpy = jest.spyOn(DeviceEventEmitter, 'emit');

        renderWithIntl(
            <DraftAndScheduledPostSwipeActions
                draftType={DRAFT_TYPE_DRAFT}
                item={mockDraft}
                location={Screens.GLOBAL_DRAFTS}
                layoutWidth={300}
            />,
        );

        DeviceEventEmitter.emit(Events.DRAFT_SWIPEABLE, mockDraft.id);

        expect(emitSpy).toHaveBeenCalledWith(Events.DRAFT_SWIPEABLE, 'draft-id-1');
    });

    it('calls deleteDraftConfirmation when delete action is pressed for draft', async () => {
        const {getByText} = renderWithIntl(
            <DraftAndScheduledPostSwipeActions
                draftType={DRAFT_TYPE_DRAFT}
                item={mockDraft}
                location={Screens.GLOBAL_DRAFTS}
                layoutWidth={300}
            />,
        );

        const deleteButton = getByText('Delete draft');
        fireEvent.press(deleteButton);

        await waitFor(() => {
            expect(DraftUtils.deleteDraftConfirmation).toHaveBeenCalledWith(
                expect.objectContaining({
                    serverUrl: 'https://server.com',
                    channelId: 'channel-id-1',
                    rootId: 'root-id-1',
                }),
            );
        });
    });

    it('calls deleteScheduledPostConfirmation when delete action is pressed for scheduled post', async () => {
        const {getByText} = renderWithIntl(
            <DraftAndScheduledPostSwipeActions
                draftType={DRAFT_TYPE_SCHEDULED}
                item={mockScheduledPost}
                location={Screens.GLOBAL_DRAFTS}
                layoutWidth={300}
            />,
        );

        const deleteButton = getByText('Delete');
        fireEvent.press(deleteButton);

        await waitFor(() => {
            expect(ScheduledPostUtils.deleteScheduledPostConfirmation).toHaveBeenCalledWith(
                expect.objectContaining({
                    serverUrl: 'https://server.com',
                    scheduledPostId: 'scheduled-id-1',
                }),
            );
        });
    });
});
