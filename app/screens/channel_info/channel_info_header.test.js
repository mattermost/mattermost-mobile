// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';
import {General} from 'mattermost-redux/constants';

import ChannelInfoHeader from './channel_info_header.js';

jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('channel_info_header', () => {
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
        createAt: 123,
        creator: 'Creator',
        memberCount: 3,
        displayName: 'Channel name',
        header: 'Header string',
        onPermalinkPress: jest.fn(),
        purpose: 'Purpose string',
        status: 'status',
        theme: Preferences.THEMES.default,
        type: General.OPEN_CHANNEL,
        isArchived: false,
        isBot: false,
        hasGuests: false,
        isGroupConstrained: false,
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <ChannelInfoHeader
                {...baseProps}
            />,
            {context: {intl: intlMock}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when is group constrained', async () => {
        const wrapper = shallow(
            <ChannelInfoHeader
                {...baseProps}
                isGroupConstrained={true}
            />,
            {context: {intl: intlMock}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when public channel and hasGuests', async () => {
        const wrapper = shallow(
            <ChannelInfoHeader
                {...baseProps}
                hasGuests={true}
            />,
            {context: {intl: intlMock}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when DM and hasGuests', async () => {
        const wrapper = shallow(
            <ChannelInfoHeader
                {...baseProps}
                type={General.DM_CHANNEL}
                hasGuests={true}
            />,
            {context: {intl: intlMock}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when GM and hasGuests', async () => {
        const wrapper = shallow(
            <ChannelInfoHeader
                {...baseProps}
                type={General.GM_CHANNEL}
                hasGuests={true}
            />,
            {context: {intl: intlMock}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
