// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import CompassIcon from '@components/compass_icon';
import ExpiryCountdown from '@components/post_list/post/header/expiry_timer';
import {Screens} from '@constants';
import {PostTypes} from '@constants/post';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Header from './header';

jest.mock('@components/compass_icon', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(CompassIcon).mockImplementation(
    (props) => React.createElement('CompassIcon', {testID: `compass-icon${props.name ? '-' + props.name : ''}`, ...props}) as any,
);

jest.mock('@components/post_list/post/header/expiry_timer', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ExpiryCountdown).mockImplementation(
    (props) => React.createElement('ExpiryCountdown', {testID: 'expiry-timer', ...props}) as any,
);

describe('Header', () => {
    const currentUser = TestHelper.fakeUserModel();

    const defaultProps = {
        commentCount: 0,
        enablePostUsernameOverride: false,
        isAutoResponse: false,
        isCustomStatusEnabled: false,
        isEphemeral: false,
        isMilitaryTime: false,
        isPendingOrFailed: false,
        isSystemPost: false,
        isWebHook: false,
        location: Screens.ABOUT,
        showPostPriority: false,
        teammateNameDisplay: '',
        hideGuestTags: false,
        currentUser,
    };

    it('Should show BoR icon for own BoR post', () => {
        const ownBoRPost = TestHelper.fakePostModel({
            type: PostTypes.BURN_ON_READ,
            userId: currentUser.id,
            metadata: {

                // missing expire_at key indicates unrevealed BoR post
            },
        });

        renderWithIntlAndTheme(
            <Header
                {...defaultProps}
                post={ownBoRPost}
            />,
        );

        expect(screen.queryByTestId('compass-icon-fire')).toBeVisible();
        expect(screen.queryByTestId('expiry-timer')).not.toBeVisible();
    });

    it('Should show BoR countdown for revealed BoR post', () => {
        const ownBoRPost = TestHelper.fakePostModel({
            type: PostTypes.BURN_ON_READ,
            metadata: {
                expire_at: Date.now() + 60000,
            },
        });

        renderWithIntlAndTheme(
            <Header
                {...defaultProps}
                post={ownBoRPost}
            />,
        );

        expect(screen.queryByTestId('expiry-timer')).toBeVisible();
    });
});
