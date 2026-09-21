// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {switchToChannelById} from '@actions/remote/channel';
import {dismissIncomingCall, joinCallAndOpenCallScreen} from '@calls/actions/calls';
import {removeIncomingCall} from '@calls/state';
import {ChannelType} from '@calls/types/calls';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {CallNotification} from './call_notification';

jest.mock('@actions/remote/channel', () => ({
    switchToChannelById: jest.fn(),
}));

jest.mock('@actions/remote/user', () => ({
    fetchProfilesInChannel: jest.fn(),
}));

jest.mock('@calls/actions/calls', () => ({
    dismissIncomingCall: jest.fn(),
    joinCallAndOpenCallScreen: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    playIncomingCallsRinging: jest.fn(),
    removeIncomingCall: jest.fn(),
}));

jest.mock('@components/profile_picture', () => 'ProfilePicture');

const SERVER_URL = 'https://test.server.com';

jest.mock('@context/server', () => ({
    useServerUrl: () => SERVER_URL,
}));

describe('CallNotification', () => {
    const caller = TestHelper.fakeUserModel({id: 'caller-id', username: 'caller'});

    function getBaseProps(): ComponentProps<typeof CallNotification> {
        return {
            servers: [],
            incomingCall: {
                serverUrl: SERVER_URL,
                myUserId: 'my-id',
                callID: 'call-id',
                channelID: 'channel-id',
                callerID: caller.id,
                callerModel: caller,
                startAt: Date.now(),
                type: ChannelType.DM,
            },
            currentUserId: 'my-id',
            teammateNameDisplay: 'username',
        };
    }

    it('should answer the call and open the call screen when pressed', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<CallNotification {...props}/>);

        fireEvent.press(getByTestId('calls.call_notification.answer'));

        // The conversation is left underneath the call view, so hanging up lands the user in it.
        expect(switchToChannelById).toHaveBeenCalledWith(SERVER_URL, 'channel-id');
        await waitFor(() => {
            expect(joinCallAndOpenCallScreen).toHaveBeenCalledWith(expect.anything(), SERVER_URL, 'channel-id');
        });
    });

    it('should dismiss the call everywhere without answering it', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<CallNotification {...props}/>);

        fireEvent.press(getByTestId('calls.call_notification.dismiss'));

        expect(removeIncomingCall).toHaveBeenCalledWith(SERVER_URL, 'call-id', 'channel-id');
        expect(dismissIncomingCall).toHaveBeenCalledWith(SERVER_URL, 'channel-id');
        expect(joinCallAndOpenCallScreen).not.toHaveBeenCalled();
    });
});
