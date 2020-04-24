// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import {RequestStatus} from '@mm-redux/constants';

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

const getMyTeams = async () => {
    return {
        error: {},
    };
};

describe('SelectTeam', () => {
    const actions = {
        getTeams,
        getMyTeams,
        handleTeamChange: jest.fn(),
        addUserToTeam: jest.fn(),
        joinTeam: jest.fn(),
        logout: jest.fn(),
    };

    const baseProps = {
        actions,
        currentChannelId: 'someId',
        currentUserIsGuest: false,
        currentUserId: 'fakeid',
        currentUrl: 'test',
        userWithoutTeams: false,
        teams: [],
        theme: Preferences.THEMES.default,
        teamsRequest: {
            status: RequestStatus.FAILURE,
        },
        componentId: 'component-id',
        isLandscape: false,
        serverVersion: '5.18',
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

    test('should match snapshot when user is a guest', async () => {
        const props = {
            ...baseProps,
            currentUserIsGuest: true,
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
        await getMyTeams();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call joinTeam versions prior to 5.18', async () => {
        const props = {
            ...baseProps,
            serverVersion: '5.17',
        };

        const wrapper = shallow(
            <SelectTeam {...props}/>,
        );
        wrapper.instance().onSelectTeam({id: 'test_id', invite_id: 'test_invite_id'});

        expect(props.actions.joinTeam).toBeCalledWith('test_invite_id', 'test_id');
        expect(props.actions.addUserToTeam).not.toBeCalled();
    });

    test('should call joinTeam versions posterior to 5.18', async () => {
        const props = {
            ...baseProps,
            serverVersion: '5.18',
        };

        const wrapper = shallow(
            <SelectTeam {...props}/>,
        );
        wrapper.instance().onSelectTeam({id: 'test_id', invite_id: 'test_invite_id'});

        expect(props.actions.joinTeam).not.toBeCalled();
        expect(props.actions.addUserToTeam).toBeCalledWith('test_id', 'fakeid');
    });
});
