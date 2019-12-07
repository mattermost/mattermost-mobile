// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';
import {General} from 'mattermost-redux/constants';

import ChannelInfo from './channel_info';

// ChannelInfoRow expects to receive the pinIcon as a number
jest.mock('assets/images/channel_info/pin.png', () => {
    return 1;
});

jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('channel_info', () => {
    const intlMock = {
        formatMessage: jest.fn(),
        formatDate: jest.fn(),
        formatTime: jest.fn(),
        formatRelative: jest.fn(),
        formatNumber: jest.fn(),
        formatPlural: jest.fn(),
        formatHTMLMessage: jest.fn(),
        now: jest.fn(),
    };
    const baseProps = {
        canDeleteChannel: true,
        canUndeleteChannel: false,
        canConvertChannel: true,
        canManageUsers: true,
        viewArchivedChannels: true,
        canEditChannel: true,
        currentChannel: {
            id: '1234',
            display_name: 'Channel Name',
            type: General.OPEN_CHANNEL,
            create_at: 123,
            delete_at: 0,
            header: '',
            purpose: 'Purpose',
            group_constrained: false,
        },
        currentChannelCreatorName: 'Creator',
        currentChannelMemberCount: 2,
        currentChannelGuestCount: 0,
        currentUserId: '1234',
        currentUserIsGuest: false,
        isChannelMuted: false,
        ignoreChannelMentions: false,
        isCurrent: true,
        isFavorite: false,
        status: 'status',
        theme: Preferences.THEMES.default,
        isBot: false,
        isTeammateGuest: false,
        isLandscape: false,
        actions: {
            clearPinnedPosts: jest.fn(),
            closeDMChannel: jest.fn(),
            closeGMChannel: jest.fn(),
            convertChannelToPrivate: jest.fn(),
            deleteChannel: jest.fn(),
            undeleteChannel: jest.fn(),
            getChannelStats: jest.fn(),
            getChannel: jest.fn(),
            leaveChannel: jest.fn(),
            loadChannelsByTeamName: jest.fn(),
            favoriteChannel: jest.fn(),
            unfavoriteChannel: jest.fn(),
            getCustomEmojisInText: jest.fn(),
            selectFocusedPostId: jest.fn(),
            updateChannelNotifyProps: jest.fn(),
            selectPenultimateChannel: jest.fn(),
            setChannelDisplayName: jest.fn(),
            handleSelectChannel: jest.fn(),
        },
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <ChannelInfo
                {...baseProps}
            />,
            {context: {intl: intlMock}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should render convert to private button when user has team admin permissions', async () => {
        const wrapper = shallow(
            <ChannelInfo
                {...baseProps}
            />,
            {context: {intl: intlMock}},
        );

        const instance = wrapper.instance();
        const render = instance.renderConvertToPrivateRow();
        expect(render).toBeTruthy();
    });

    test('should not render convert to private button when user is not team admin or above', async () => {
        const wrapper = shallow(
            <ChannelInfo
                {...baseProps}
                canConvertChannel={false}
            />,
            {context: {intl: intlMock}},
        );

        const instance = wrapper.instance();
        const render = instance.renderConvertToPrivateRow();
        expect(render).toBeFalsy();
    });

    test('should not render convert to private button currentChannel is already private', async () => {
        const props = Object.assign({}, baseProps);
        props.currentChannel.type = General.PRIVATE_CHANNEL;
        const wrapper = shallow(
            <ChannelInfo
                {...props}
            />,
            {context: {intl: intlMock}},
        );

        const instance = wrapper.instance();
        const render = instance.renderConvertToPrivateRow();
        expect(render).toBeFalsy();
    });

    test('should not render convert to private button when currentChannel is a default channel', async () => {
        const props = Object.assign({}, baseProps);
        props.currentChannel.name = General.DEFAULT_CHANNEL;
        const wrapper = shallow(
            <ChannelInfo
                {...props}
            />,
            {context: {intl: intlMock}},
        );

        const instance = wrapper.instance();
        const render = instance.renderConvertToPrivateRow();
        expect(render).toBeFalsy();
    });

    test('should render unarchive channel button when currentChannel is an archived channel', async () => {
        const props = Object.assign({}, baseProps);
        props.currentChannel.delete_at = 1234566;
        const wrapper = shallow(
            <ChannelInfo
                {...props}
            />,
            {context: {intl: intlMock}},
        );

        const instance = wrapper.instance();
        const render = instance.renderUnarchiveChannel();
        expect(render).toBeTruthy();
    });
});
