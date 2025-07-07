// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import UserAvatarsStack from '@components/user_avatars_stack';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import JoinCallBanner from './join_call_banner';

// Mock the dependencies
jest.mock('@calls/actions', () => ({
    dismissIncomingCall: jest.fn(),
}));

jest.mock('@calls/alerts', () => ({
    leaveAndJoinWithAlert: jest.fn(),
    showLimitRestrictedAlert: jest.fn(),
}));

jest.mock('@calls/state', () => ({
    removeIncomingCall: jest.fn(),
    setJoiningChannelId: jest.fn(),
}));

jest.mock('@components/user_avatars_stack');
jest.mocked(UserAvatarsStack).mockImplementation((props) => {
    return React.createElement('UserAvatarsStack', {
        ...props,
        testID: 'user-avatars-stack',
    });
});

describe('JoinCallBanner', () => {
    function getBaseProps(): ComponentProps<typeof JoinCallBanner> {
        return {
            channelId: 'channel-123',
            callId: 'call-456',
            serverUrl: 'https://test.server.com',
            userModels: [
                TestHelper.fakeUserModel({id: 'user-1', username: 'user1'}),
                TestHelper.fakeUserModel({id: 'user-2', username: 'user2'}),
            ],
            channelCallStartTime: Date.now() - 60000, // 1 minute ago
            limitRestrictedInfo: {
                limitRestricted: false,
                maxParticipants: 8,
                isCloudStarter: false,
            },
        };
    }

    it('should use the correct bottom sheet title', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithIntlAndTheme(<JoinCallBanner {...props}/>);

        expect(getByTestId('user-avatars-stack').props.bottomSheetTitle.defaultMessage).toBe('Call participants');
    });
});
