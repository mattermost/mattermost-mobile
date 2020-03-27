// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@redux/constants/preferences';

import FailedNetworkAction from 'app/components/failed_network_action';
import ErrorTeamsList from './error_teams_list';

describe('ErrorTeamsList', () => {
    const loadMe = async () => {
        return {
            data: {},
        };
    };

    const baseProps = {
        actions: {
            loadMe: () => true,
            connection: () => true,
            logout: () => true,
            selectDefaultTeam: () => true,
        },
        componentId: 'component-id',
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ErrorTeamsList {...baseProps}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call for userInfo on retry', async () => {
        const connection = jest.fn();
        const selectDefaultTeam = jest.fn();
        const logout = jest.fn();
        const actions = {
            ...baseProps.actions,
            loadMe,
            logout,
            selectDefaultTeam,
            connection,
        };

        const newProps = {
            ...baseProps,
            actions,
        };

        const wrapper = shallow(
            <ErrorTeamsList {...newProps}/>,
        );

        wrapper.find(FailedNetworkAction).props().onRetry();
        await loadMe();
        expect(selectDefaultTeam).toHaveBeenCalledTimes(1);
    });
});
