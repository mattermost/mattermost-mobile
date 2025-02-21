// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {General, Screens} from '@constants';
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@screens/global_drafts/constants';
import {dismissBottomSheet} from '@screens/navigation';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import SendDraft from './send_draft';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

describe('Send Draft', () => {
    it('should render the component', () => {
        const props = {
            channelId: 'channel_id',
            channelName: 'channel_name',
            rootId: '',
            channelType: General.OPEN_CHANNEL,
            bottomSheetId: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            currentUserId: 'current_user_id',
            maxMessageLength: 4000,
            useChannelMentions: true,
            userIsOutOfOffice: false,
            customEmojis: [],
            value: 'value',
            files: [],
            postPriority: '' as unknown as PostPriority,
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_DRAFT as DraftType,
        };
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByText} = wrapper;
        expect(getByText('Send draft')).toBeTruthy();
    });

    it('should call dismissBottomSheet after sending the draft', () => {
        const props = {
            channelId: 'channel_id',
            channelName: 'channel_name',
            rootId: '',
            channelType: General.OPEN_CHANNEL,
            bottomSheetId: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            currentUserId: 'current_user_id',
            maxMessageLength: 4000,
            useChannelMentions: true,
            userIsOutOfOffice: false,
            customEmojis: [],
            value: 'value',
            files: [],
            postPriority: '' as unknown as PostPriority,
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftReceiverUserName: undefined,
        };
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByTestId} = wrapper;
        fireEvent.press(getByTestId('send_draft_button'));
        expect(dismissBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('should render the component for scheduled post', () => {
        const props = {
            channelId: 'channel_id',
            channelName: 'channel_name',
            rootId: '',
            channelType: General.OPEN_CHANNEL,
            bottomSheetId: Screens.DRAFT_SCHEDULED_POST_OPTIONS,
            currentUserId: 'current_user_id',
            maxMessageLength: 4000,
            useChannelMentions: true,
            userIsOutOfOffice: false,
            customEmojis: [],
            value: 'value',
            files: [],
            postPriority: '' as unknown as PostPriority,
            persistentNotificationInterval: 0,
            persistentNotificationMaxRecipients: 0,
            draftReceiverUserName: undefined,
            draftType: DRAFT_TYPE_SCHEDULED as DraftType,
        };
        const wrapper = renderWithIntlAndTheme(
            <SendDraft
                {...props}
            />,
        );
        const {getByText} = wrapper;
        expect(getByText('Send')).toBeTruthy();
    });
});
