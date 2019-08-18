// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {Navigation} from 'react-native-navigation';

import {General, Preferences, Roles} from 'app/constants';

import ChannelItem from './channel_item.js';

jest.useFakeTimers();
jest.mock('react-intl');

Array.prototype.filtered = function filtered() { //eslint-disable-line no-extend-native
    return this;
};

describe('ChannelItem', () => {
    const channel = {
        id: 'channel_id',
        deleteAt: 0,
        type: General.OPEN_CHANNEL,
        status: 'online',
        displayName: 'Test Channel',
        totalMsgCount: 2,
        members: [{
            id: 'channel_id-current_user_id',
            msgCount: 1,
            mentionCount: 0,
            user: {
                id: 'current_user_id',
                username: 'test',
                firstName: 'Test',
                lastName: 'Account',
                fullName: 'Test Account',
                status: 'offline',
            },
        }],
    };

    const baseProps = {
        channel,
        channelId: 'channel_id',
        currentChannelId: 'current_channel_id',
        currentUserId: 'current_user_id',
        experimentalHideTownSquare: 'false',
        fake: false,
        isChannelMuted: false,
        isFavorite: false,
        isLandscape: false,
        isSearchResult: false,
        isUnread: true,
        hasDraft: false,
        locale: 'en',
        onSelectChannel: jest.fn(),
        previewChannel: jest.fn(),
        teammateDisplayNameSettings: Preferences.TEAMMATE_NAME_DISPLAY.SHOW_FULLNAME,
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ChannelItem {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with mentions and muted', () => {
        const members = [{
            id: 'channel_id-current_user_id',
            msgCount: 0,
            mentionCount: 1,
            user: {
                id: 'current_user_id',
                username: 'test',
                firstName: 'Test',
                lastName: 'Account',
                fullName: 'Test Account',
                status: 'offline',
            },
        }];

        const newProps = {
            ...baseProps,
            channel: {
                ...baseProps.channel,
                members,
            },
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for deactivated user and not searchResults or currentChannel', () => {
        const members = [{
            id: 'channel_id-current_user_id',
            msgCount: 0,
            mentionCount: 1,
            user: {
                id: 'current_user_id',
                username: 'test',
                firstName: 'Test',
                lastName: 'Account',
                fullName: 'Test Account',
                status: 'offline',
            },
        }, {
            id: 'channel_id-other_user_id',
            msgCount: 0,
            mentionCount: 0,
            user: {
                id: 'other_user_id',
                username: 'another',
                firstName: 'Another',
                lastName: 'Account',
                fullName: 'Another Account',
                status: 'online',
            },
        }];

        const channelObj = {
            ...channel,
            members,
            name: 'current_user_id__other_user_id',
            type: General.DM_CHANNEL,
            deleteAt: 123,
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.getElement()).toBe(null);
    });

    test('should match snapshot for deactivated user and is searchResult', () => {
        const members = [{
            id: 'channel_id-current_user_id',
            msgCount: 0,
            mentionCount: 1,
            user: {
                id: 'current_user_id',
                username: 'test',
                firstName: 'Test',
                lastName: 'Account',
                fullName: 'Test Account',
                status: 'offline',
            },
        }, {
            id: 'channel_id-other_user_id',
            msgCount: 0,
            mentionCount: 0,
            user: {
                id: 'other_user_id',
                username: 'another',
                firstName: 'Another',
                lastName: 'Account',
                fullName: 'Another Account',
                status: 'online',
            },
        }];

        const channelObj = {
            ...channel,
            members,
            name: 'current_user_id__other_user_id',
            type: General.DM_CHANNEL,
            deleteAt: 123,
        };

        const newProps = {
            ...baseProps,
            isSearchResult: true,
            channel: channelObj,
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.getElement()).not.toBe(null);
    });

    test('should match snapshot for deactivated user and is currentChannel', () => {
        const members = [{
            id: 'channel_id-current_user_id',
            msgCount: 0,
            mentionCount: 1,
            user: {
                id: 'current_user_id',
                username: 'test',
                firstName: 'Test',
                lastName: 'Account',
                fullName: 'Test Account',
                status: 'offline',
            },
        }, {
            id: 'channel_id-other_user_id',
            msgCount: 0,
            mentionCount: 0,
            user: {
                id: 'other_user_id',
                username: 'another',
                firstName: 'Another',
                lastName: 'Account',
                fullName: 'Another Account',
                status: 'online',
            },
        }];

        const channelObj = {
            ...channel,
            members,
            name: 'current_user_id__other_user_id',
            type: General.DM_CHANNEL,
            deleteAt: 123,
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
            currentChannelId: 'channel_id',
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.getElement()).not.toBe(null);
    });

    test('should match snapshot for current user i.e currentUser (you)', () => {
        const channelObj = {
            ...channel,
            name: 'current_user_id__current_user_id',
            type: General.DM_CHANNEL,
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
            currentChannelId: 'channel_id',
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: (intlId) => intlId.defaultMessage}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for current user i.e currentUser (you) when isSearchResult', () => {
        const channelObj = {
            ...channel,
            type: General.DM_CHANNEL,
            id: 'current_user_id',
            name: 'current_user_id__current_user_id',
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
            currentChannelId: 'channel_id',
            isSearchResult: true,
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: (intlId) => intlId.defaultMessage}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with draft', () => {
        const wrapper = shallow(
            <ChannelItem
                {...baseProps}
                hasDraft={true}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should not show default channel', () => {
        const members = [{
            id: 'town_square_channel-current_user_id',
            msgCount: 10,
            mentionCount: 0,
            user: {
                id: 'current_user_id',
                username: 'test',
                firstName: 'Test',
                lastName: 'Account',
                fullName: 'Test Account',
                status: 'offline',
                roles: Roles.SYSTEM_ADMIN_ROLE,
            },
        }, {
            id: 'town_square_channel-other_user_id',
            msgCount: 0,
            mentionCount: 0,
            user: {
                id: 'other_user_id',
                username: 'another',
                firstName: 'Another',
                lastName: 'Account',
                fullName: 'Another Account',
                status: 'online',
            },
        }];

        const channelObj = {
            ...channel,
            totalMsgCount: 10,
            members,
            id: 'town_square_channel',
            name: 'town-square',
            displayName: 'Town Square',
            type: General.OPEN_CHANNEL,
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
            currentChannelId: 'channel_id',
        };

        const wrapper = shallow(
            <ChannelItem
                {...newProps}
                hasDraft={true}
                experimentalHideTownSquare='true'
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toBe(null);
    });

    test('Should call onPress', () => {
        const wrapper = shallow(
            <ChannelItem
                {...baseProps}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.find(Navigation.TouchablePreview).simulate('press');
        jest.runAllTimers();

        const expectedChannelParams = {id: baseProps.channelId, displayName: channel.displayName, fake: false, type: channel.type};
        expect(baseProps.onSelectChannel).toHaveBeenCalledWith(expectedChannelParams, baseProps.currentChannelId);
    });
});
