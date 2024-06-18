// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, screen, userEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {getTeamById} from '@queries/servers/team';
import TestHelper from '@test/test_helper';

import TeamItem from './team_item';

import type TeamModel from '@typings/database/models/servers/team';

jest.mock('@managers/performance_metrics_manager');

function getBaseProps(): ComponentProps<typeof TeamItem> {
    return {
        hasUnreads: false,
        mentionCount: 0,
        selected: false,
    };
}

describe('performance metrics', () => {
    const serverUrl = 'http://www.someserverurl.com';
    let team: TeamModel | undefined;
    beforeAll(() => {
        jest.useFakeTimers({legacyFakeTimers: true});
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    beforeEach(async () => {
        userEvent.setup({advanceTimers: jest.advanceTimersByTime});
        const {database} = await TestHelper.setupServerDatabase(serverUrl);
        team = await getTeamById(database, TestHelper.basicTeam!.id);
    });

    afterEach(async () => {
        await TestHelper.tearDown();
    });

    it('happy path', async () => {
        const baseProps = getBaseProps();
        baseProps.team = team;
        render(<TeamItem {...baseProps}/>);
        const button = await screen.findByTestId(`team_sidebar.team_list.team_item.${team!.id}.not_selected`);
        await userEvent.press(button);
        expect(PerformanceMetricsManager.startMetric).toHaveBeenCalledWith('mobile_team_switch');
    });

    it('do not start when the team is already selected', async () => {
        const baseProps = getBaseProps();
        baseProps.team = team;
        baseProps.selected = true;
        render(<TeamItem {...baseProps}/>);
        const button = await screen.findByTestId(`team_sidebar.team_list.team_item.${team!.id}.selected`);
        await userEvent.press(button);
        expect(PerformanceMetricsManager.startMetric).not.toHaveBeenCalled();
    });
});
