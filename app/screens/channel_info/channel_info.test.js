// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import {General, Preferences} from 'app/constants';

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
        canEditChannel: true,
        canConvertChannel: true,
        canManageUsers: true,
        closeDirectChannel: jest.fn(),
        componentId: 'Component1',
        convertChannelToPrivate: jest.fn(),
        currentChannel: {
            id: '1234',
            displayName: 'Channel Name',
            type: General.OPEN_CHANNEL,
            createAt: 123,
            deleteAt: 0,
            header: '',
            purpose: 'Purpose',
            groupConstrained: false,
        },
        currentChannelGuestCount: 0,
        currentChannelCreatorName: 'Creator',
        currentChannelMemberCount: 2,
        currentUserId: '1234',
        currentUserIsGuest: false,
        deleteChannel: jest.fn(),
        getChannel: jest.fn(),
        getChannelStats: jest.fn(),
        getCustomEmojisInText: jest.fn(),
        handleSelectChannel: jest.fn(),
        ignoreChannelMentions: false,
        isBot: false,
        isChannelMuted: false,
        isFavorite: false,
        isTeammateGuest: false,
        leaveChannel: jest.fn(),
        loadChannelsByTeamName: jest.fn(),
        locale: 'en',
        markChannelAsFavorite: jest.fn(),
        selectInitialChannel: jest.fn(),
        status: 'status',
        teammateDisplayNameSettings: Preferences.DISPLAY_PREFER_FULL_NAME,
        theme: Preferences.THEMES.default,
        updateChannelNotifyProps: jest.fn(),
        viewArchivedChannels: false,
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
        const render = instance.shouldRenderConvertToPrivateRow();
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
        const render = instance.shouldRenderConvertToPrivateRow();
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
        const render = instance.shouldRenderConvertToPrivateRow();
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
        const render = instance.shouldRenderConvertToPrivateRow();
        expect(render).toBeFalsy();
    });
});
