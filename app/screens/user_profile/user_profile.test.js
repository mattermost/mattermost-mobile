// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import UserProfile from './user_profile.js';
import BotTag from 'app/components/bot_tag';

jest.mock('react-intl');
jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('user_profile', () => {
    const actions = {
        setChannelDisplayName: jest.fn(),
        makeDirectChannel: jest.fn(),
        loadBot: jest.fn(),
    };
    const baseProps = {
        actions,
        config: {
            ShowEmailAddress: true,
        },
        teammateNameDisplay: 'username',
        navigator: {
            resetTo: jest.fn(),
        },
        teams: [],
        theme: Preferences.THEMES.default,
        enableTimezone: false,
        militaryTime: false,
    };

    const user = {
        email: 'test@test.com',
        first_name: 'test',
        id: '4hzdnk6mg7gepe7yze6m3domnc',
        last_name: 'fake',
        nickname: 'nick',
        username: 'fred',
        is_bot: false,
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={user}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should contain bot tag', async () => {
        const botUser = {
            email: 'test@test.com',
            first_name: 'test',
            id: '4hzdnk6mg7gepe7yze6m3domnc',
            last_name: 'fake',
            nickname: 'nick',
            username: 'fred',
            is_bot: true,
        };

        const wrapper = shallow(
            <UserProfile
                {...baseProps}
                user={botUser}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.containsMatchingElement(
            <BotTag
                show={true}
                theme={baseProps.theme}
            />
        )).toEqual(true);
    });
});
