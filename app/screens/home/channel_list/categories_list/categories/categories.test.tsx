// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {cleanup} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {renderWithEverything, act, waitFor, screen, waitForElementToBeRemoved} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SharedDataProvider from './shared_data_context';

import Categories from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type Database from '@nozbe/watermelondb/Database';

jest.mock('@managers/performance_metrics_manager');

describe('Categories', () => {
    describe('components/channel_list/categories', () => {
        let database: Database;
        beforeAll(async () => {
            const server = await TestHelper.setupServerDatabase();
            database = server.database;
        });

        afterEach(async () => {
            cleanup();

            // Allow observables to settle before next test
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        afterAll(async () => {
            await TestHelper.tearDown();
        });

        it('render without error', async () => {
            const wrapper = renderWithEverything(
                <Categories isTablet={false}/>,
                {database},
            );

            await waitFor(() => {
                expect(wrapper.toJSON()).toBeTruthy();
            });
        });
    });

    describe('performance metrics', () => {
        let database: Database;
        const serverUrl = 'http://www.someserverurl.com';
        beforeAll(async () => {
            const server = await TestHelper.setupServerDatabase(serverUrl);
            database = server.database;
        });

        afterEach(async () => {
            cleanup();

            // Allow observables to settle before next test
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        afterAll(async () => {
            await TestHelper.tearDown();
        });

        it('properly send metric on load', () => {
            renderWithEverything(<Categories isTablet={false}/>, {database, serverUrl});
            expect(PerformanceMetricsManager.endMetric).toHaveBeenCalledWith('mobile_team_switch', serverUrl);
        });

        it('properly call again after switching teams', async () => {
            renderWithEverything(<Categories isTablet={false}/>, {database, serverUrl});
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

    describe('unreadsOnTop overrides a stuck onlyUnreads filter', () => {
        let database: Database;
        let operator: ServerDataOperator;
        const serverUrl = 'http://categories-unreads-on-top-test.com';

        beforeAll(async () => {
            const server = await TestHelper.setupServerDatabase(serverUrl);
            database = server.database;
            operator = server.operator;
        });

        afterEach(async () => {
            cleanup();

            // Allow observables to settle before next test
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        afterAll(async () => {
            await TestHelper.tearDown();
        });

        it('still renders read channels instead of the only-unreads empty state', async () => {
            // basicChannel/basicMyChannel (seeded by setupServerDatabase) is read, not unread — if the
            // stored onlyUnreads filter were still honored, the list would collapse to the empty-unreads screen.
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.ONLY_UNREADS, value: JSON.stringify(true)}],
                prepareRecordsOnly: false,
            });

            const wrapper = renderWithEverything(
                <SharedDataProvider
                    isTablet={false}
                    unreadsOnTop={true}
                >
                    <Categories
                        isTablet={false}
                        unreadsOnTop={true}
                        headerButtons={[]}
                    />
                </SharedDataProvider>,
                {database, serverUrl},
            );

            await waitFor(() => {
                const channelItem = wrapper.root.findAll(
                    (n) => n.props?.testID === `channel_list.category.${TestHelper.basicCategory!.type}.channel_item`,
                );
                expect(channelItem.length).toBeGreaterThan(0);
            }, {timeout: 500});
        });
    });
});
