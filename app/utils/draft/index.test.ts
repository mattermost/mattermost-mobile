// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createIntl} from 'react-intl';
import {Alert} from 'react-native';

import {General} from '@constants';

import {
    errorBadChannel,
    errorUnkownUser,
    permalinkBadTeam,
    alertErrorWithFallback,
    alertAttachmentFail,
    textContainsAtAllAtChannel,
    textContainsAtHere,
    buildChannelWideMentionMessage,
    alertChannelWideMention,
    alertSendToGroups,
    getStatusFromSlashCommand,
    alertSlashCommandFailed,
} from './';

jest.mock('@i18n', () => ({
    t: (id: string) => id,
}));

describe('draft utils', () => {
    const intl = createIntl({locale: 'en', messages: {}});

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should alert error bad channel', () => {
        errorBadChannel(intl);
        expect(Alert.alert).toHaveBeenCalledWith('', 'This link belongs to a deleted channel or to a channel to which you do not have access.', undefined);
    });

    it('should alert error unknown user', () => {
        errorUnkownUser(intl);
        expect(Alert.alert).toHaveBeenCalledWith('', 'We can\'t redirect you to the DM. The user specified is unknown.', undefined);
    });

    it('should alert permalink bad team', () => {
        permalinkBadTeam(intl);
        expect(Alert.alert).toHaveBeenCalledWith('', 'This link belongs to a deleted team or to a team to which you do not have access.', undefined);
    });

    it('should alert error with fallback', () => {
        const error = {message: 'Test Error'};
        const fallback = {id: 'fallback.id', defaultMessage: 'Fallback Message'};
        alertErrorWithFallback(intl, error, fallback);
        expect(Alert.alert).toHaveBeenCalledWith('', 'Test Error', undefined);
    });

    it('should alert error with fallback when network request failed', () => {
        const error = {message: 'Network request failed'};
        const fallback = {id: 'fallback.id', defaultMessage: 'Fallback Message'};

        alertErrorWithFallback(intl, error, fallback);
        expect(Alert.alert).toHaveBeenCalledWith('', 'Fallback Message', undefined);
    });

    it('should alert attachment fail', () => {
        const accept = jest.fn();
        const cancel = jest.fn();

        alertAttachmentFail(intl, accept, cancel);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Attachment failure',
            'Some attachments failed to upload to the server. Are you sure you want to post the message?',
            [
                {text: 'No', onPress: cancel},
                {text: 'Yes', onPress: accept},
            ],
        );
    });

    it('should detect @all and @channel in text', () => {
        const text = 'Hello @all';
        expect(textContainsAtAllAtChannel(text)).toBe(true);
    });

    it('should detect @here in text', () => {
        const text = 'Hello @here';
        expect(textContainsAtHere(text)).toBe(true);
    });

    it('should build channel-wide mention message with timezones', () => {
        const membersCount = 10;
        const channelTimezoneCount = 3;

        let message = buildChannelWideMentionMessage(intl, membersCount, channelTimezoneCount, true);
        expect(message).toBe('By using @here you are about to send notifications up to 9 people in 3 timezones. Are you sure you want to do this?');

        message = buildChannelWideMentionMessage(intl, membersCount, channelTimezoneCount, false);
        expect(message).toBe('By using @all or @channel you are about to send notifications to 9 people in 3 timezones. Are you sure you want to do this?');
    });

    it('should build channel-wide mention message without timezones', () => {
        const membersCount = 10;
        const channelTimezoneCount = 0;

        let message = buildChannelWideMentionMessage(intl, membersCount, channelTimezoneCount, true);
        expect(message).toBe('By using @here you are about to send notifications to up to 9 people. Are you sure you want to do this?');

        message = buildChannelWideMentionMessage(intl, membersCount, channelTimezoneCount, false);
        expect(message).toBe('By using @all or @channel you are about to send notifications to 9 people. Are you sure you want to do this?');
    });

    it('should alert channel-wide mention', () => {
        const notifyAllMessage = 'Notify all message';
        const accept = jest.fn();
        const cancel = jest.fn();

        alertChannelWideMention(intl, notifyAllMessage, accept, cancel);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Confirm sending notifications to entire channel',
            'Notify all message',
            [
                {text: 'Cancel', onPress: cancel},
                {text: 'Confirm', onPress: accept},
            ],
        );
    });

    it('should alert send to groups', () => {
        const notifyAllMessage = 'Notify all message';
        const accept = jest.fn();
        const cancel = jest.fn();

        alertSendToGroups(intl, notifyAllMessage, accept, cancel);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Confirm sending notifications to groups',
            'Notify all message',
            [
                {text: 'Cancel', onPress: cancel},
                {text: 'Confirm', onPress: accept},
            ],
        );
    });

    it('should get status from slash command', () => {
        General.STATUS_COMMANDS = ['status'];
        const message = '/status';
        expect(getStatusFromSlashCommand(message)).toBe('status');
    });

    it('should not get status from non-status slash command', () => {
        General.STATUS_COMMANDS = ['status'];
        const message = '/nonstatus';
        expect(getStatusFromSlashCommand(message)).toBe('');
    });

    it('should alert slash command failed', () => {
        const error = 'Error message';

        alertSlashCommandFailed(intl, error);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Error Executing Command',
            'Error message',
        );
    });
});
