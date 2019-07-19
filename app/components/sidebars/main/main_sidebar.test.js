// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import ChannelSidebar from './main_sidebar';

jest.mock('react-intl');

describe('ChannelSidebar', () => {
    const baseProps = {
        actions: {
            getTeams: jest.fn(),
            logChannelSwitch: jest.fn(),
            makeDirectChannel: jest.fn(),
            setChannelDisplayName: jest.fn(),
            setChannelLoading: jest.fn(),
        },
        blurPostTextBox: jest.fn(),
        currentTeamId: 'current-team-id',
        currentUserId: 'current-user-id',
        deviceWidth: 10,
        isLandscape: false,
        teamsCount: 2,
        theme: Preferences.THEMES.default,
    };

    test('should match, full snapshot', () => {
        const wrapper = shallow(
            <ChannelSidebar {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
