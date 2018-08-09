// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import ChannelItem from './channel_item.js';

jest.mock('react-intl');

describe('ChannelItem', () => {
    const baseProps = {
        channelId: 'channel_id',
        currentChannelId: 'current_channel_id',
        displayName: 'display_name',
        fake: false,
        isChannelMuted: false,
        isMyUser: true,
        isUnread: true,
        mentions: 0,
        navigator: {push: () => {}}, // eslint-disable-line no-empty-function
        onSelectChannel: () => {}, // eslint-disable-line no-empty-function
        shouldHideChannel: false,
        showUnreadForMsgs: true,
        status: 'online',
        teammateDeletedAt: 0,
        type: 'O',
        theme: {
            sidebarText: '#aaa',
            sidebarTextActiveBorder: '#aaa',
            sidebarTextActiveColor: '#aaa',
            sidebarTextHoverBg: '#aaa',
        },
        unreadMsgs: 1,
        isArchived: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ChannelItem {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper).toMatchSnapshot();
    });
});
