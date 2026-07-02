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
        isChannelAutotranslated: false,
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

    it('should render AI-generated indicator when both props are present', () => {
        const aiPost = TestHelper.fakePostModel({
            userId: currentUser.id,
            props: {
                ai_generated_by: currentUser.id,
                ai_generated_by_username: 'ai-bot',
            },
        });

        renderWithIntlAndTheme(
            <Header
                {...defaultProps}
                post={aiPost}
            />,
        );

        expect(screen.queryByTestId('compass-icon-creation-outline')).toBeVisible();
        expect(screen.queryByTestId('post_header.ai_generated_indicator')).toBeVisible();
    });

    it('should not render AI-generated indicator when props are missing', () => {
        const post = TestHelper.fakePostModel({
            userId: currentUser.id,
            props: {},
        });

        renderWithIntlAndTheme(
            <Header
                {...defaultProps}
                post={post}
            />,
        );

        expect(screen.queryByTestId('compass-icon-creation-outline')).toBeNull();
        expect(screen.queryByTestId('post_header.ai_generated_indicator')).toBeNull();
    });

    it('should use AI-generated accessibility label when author generated the post', () => {
        const aiPost = TestHelper.fakePostModel({
            userId: currentUser.id,
            props: {
                ai_generated_by: currentUser.id,
                ai_generated_by_username: 'ai-bot',
            },
        });

        renderWithIntlAndTheme(
            <Header
                {...defaultProps}
                post={aiPost}
            />,
        );

        expect(screen.getByTestId('post_header.ai_generated_indicator')).toHaveProp('accessibilityLabel', 'AI-generated');
    });

    it('should use bot username in accessibility label when different from author', () => {
        const aiPost = TestHelper.fakePostModel({
            userId: currentUser.id,
            props: {
                ai_generated_by: 'other-bot-id',
                ai_generated_by_username: 'other-bot',
            },
        });

        renderWithIntlAndTheme(
            <Header
                {...defaultProps}
                post={aiPost}
            />,
        );

        expect(screen.getByTestId('post_header.ai_generated_indicator')).toHaveProp('accessibilityLabel', 'Message posted by @other-bot');
    });
});
