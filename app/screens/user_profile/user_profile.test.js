// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';
jest.mock('react-intl');

import UserProfile from './user_profile.js';

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
        theme: {
            centerChannelBg: '#aaa',
            centerChannelColor: '#aaa',
            color: '#aaa',
        },
        enableTimezone: false,
        user: {
            email: 'test@test.com',
            first_name: 'test',
            id: '4hzdnk6mg7gepe7yze6m3domnc',
            last_name: 'fake',
            nickname: 'nick',
        },
        militaryTime: false,
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <UserProfile {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
