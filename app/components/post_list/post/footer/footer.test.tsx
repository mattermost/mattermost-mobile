// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import UserAvatarsStack from '@components/user_avatars_stack';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Footer from './footer';

jest.mock('@components/user_avatars_stack', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(UserAvatarsStack).mockImplementation(
    (props) => React.createElement('UserAvatarsStack', {testID: 'mock-user-avatars-stack', ...props}),
);

describe('Footer', () => {
    const mockThread = TestHelper.fakeThreadModel({
        id: 'thread-123',
        replyCount: 5,
        isFollowing: true,
    });

    const mockParticipants = [
        TestHelper.fakeUserModel({id: 'user-1', username: 'user1'}),
        TestHelper.fakeUserModel({id: 'user-2', username: 'user2'}),
    ];

    const defaultProps = {
        channelId: 'channel-123',
        location: 'Channel' as const,
        participants: mockParticipants,
        teamId: 'team-123',
        thread: mockThread,
    };

    it('should use the correct bottom sheet title for the user avatars stack', () => {
        const {getByTestId} = renderWithIntlAndTheme(<Footer {...defaultProps}/>);
        expect(getByTestId('mock-user-avatars-stack').props.bottomSheetTitle.defaultMessage).toBe('Thread Participants');
    });
});
