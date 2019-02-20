// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import {RequestStatus} from 'mattermost-redux/constants';

import SelectTeam from './select_team.js';

jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

const getTeams = async () => {
    return {
        error: {},
    };
};

describe('SelectTeam', () => {
    const actions = {
        getTeams,
        handleTeamChange: jest.fn(),
        joinTeam: jest.fn(),
        logout: jest.fn(),
    };

    const baseProps = {
        actions,
        currentChannelId: 'someId',
        currentUrl: 'test',
        navigator: {
            setOnNavigatorEvent: jest.fn(),
        },
        userWithoutTeams: false,
        teams: [],
        theme: Preferences.THEMES.default,
        teamsRequest: {
            status: RequestStatus.FAILURE,
        },
    };

    test('should match snapshot for fail of teams', async () => {
        const wrapper = shallow(
            <SelectTeam {...baseProps}/>,
        );
        expect(wrapper.state('loading')).toEqual(true);
        await getTeams();
        expect(wrapper.state('loading')).toEqual(false);
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for teams', async () => {
        const props = {
            ...baseProps,
            teams: [{
                id: 'kemjcpu9bi877yegqjs18ndp4r',
                invite_id: 'ojsnudhqzbfzpk6e4n6ip1hwae',
                name: 'test',
            }],
            teamsRequest: {
                status: RequestStatus.SUCCESS,
            },
        };

        const wrapper = shallow(
            <SelectTeam {...props}/>,
        );
        expect(wrapper.state('page')).toEqual(0);
        await getTeams();
        expect(wrapper.state('page')).toEqual(1);
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
