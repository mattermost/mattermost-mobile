// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {renderWithEverything, act, waitFor, screen, waitForElementToBeRemoved} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Categories from '.';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@managers/performance_metrics_manager');

describe('components/channel_list/categories', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('render without error', () => {
        const wrapper = renderWithEverything(
            <Categories/>,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });
});

describe('performance metrics', () => {
    let database: Database;
    const serverUrl = 'http://www.someserverurl.com';
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('properly send metric on load', () => {
        renderWithEverything(<Categories/>, {database, serverUrl});
        expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_team_switch', serverUrl);
    });

    it('properly call again after switching teams', async () => {
        renderWithEverything(<Categories/>, {database, serverUrl});
        expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledTimes(1);
        act(() => {
            DeviceEventEmitter.emit(Events.TEAM_SWITCH, true);
        });
        await waitFor(() => expect(screen.queryByTestId('categories.loading')).toBeVisible());
        expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledTimes(1);
        act(() => {
            DeviceEventEmitter.emit(Events.TEAM_SWITCH, false);
        });
        await waitForElementToBeRemoved(() => screen.queryByTestId('categories.loading'));
        expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledTimes(2);
        expect(PerformanceMetricsManager.endMetric).toHaveBeenLastCalledWith('mobile_team_switch', serverUrl);
    });
});
