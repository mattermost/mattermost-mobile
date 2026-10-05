// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {cleanup} from '@testing-library/react-native';
import React from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import {useIsInitialSync} from '@hooks/is_initial_sync';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {getCurrentUser} from '@queries/servers/user';
import {renderWithEverything, act, waitFor, screen, waitForElementToBeRemoved} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RawCategories from './categories';
import * as ObserveFlattenedCategories from './helpers/observe_flattened_categories';

import Categories from './index';

import type Database from '@nozbe/watermelondb/Database';
import type UserModel from '@typings/database/models/servers/user';

jest.mock('@managers/performance_metrics_manager');
jest.mock('@hooks/is_initial_sync', () => ({
    useIsInitialSync: jest.fn(),
}));

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

    describe('categories observable', () => {
        let database: Database;
        const serverUrl = 'http://www.observable-categories.com';
        let observeSpy: jest.SpyInstance;

        beforeAll(async () => {
            const server = await TestHelper.setupServerDatabase(serverUrl);
            database = server.database;
        });

        beforeEach(() => {
            observeSpy = jest.spyOn(ObserveFlattenedCategories, 'observeFlattenedCategories');
        });

        afterEach(async () => {
            cleanup();
            observeSpy.mockRestore();

            // Allow observables to settle before next test
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        afterAll(async () => {
            await TestHelper.tearDown();
        });

        const updateCurrentUser = async (update: (user: UserModel) => void) => {
            const user = await getCurrentUser(database);
            await database.write(async () => {
                await user!.update(update);
            });
        };

        it('should build the categories pipeline once for both list props', async () => {
            renderWithEverything(<Categories isTablet={false}/>, {database, serverUrl});

            await waitFor(() => expect(observeSpy).toHaveBeenCalled());
            expect(observeSpy).toHaveBeenCalledTimes(1);
        });

        it('should not rebuild the categories pipeline when an unrelated current user field changes', async () => {
            renderWithEverything(<Categories isTablet={false}/>, {database, serverUrl});
            await waitFor(() => expect(observeSpy).toHaveBeenCalledTimes(1));

            await act(async () => {
                await updateCurrentUser((u) => {
                    u.status = 'dnd';
                });
            });

            expect(observeSpy).toHaveBeenCalledTimes(1);
        });

        it('should rebuild the categories pipeline when the current user locale changes', async () => {
            renderWithEverything(<Categories isTablet={false}/>, {database, serverUrl});
            await waitFor(() => expect(observeSpy).toHaveBeenCalledTimes(1));

            await act(async () => {
                await updateCurrentUser((u) => {
                    u.locale = 'es';
                });
            });

            await waitFor(() => expect(observeSpy).toHaveBeenCalledTimes(2));
            expect(observeSpy).toHaveBeenLastCalledWith(database, TestHelper.basicUser!.id, 'es', false, false, TestHelper.basicTeam!.id);
        });
    });

    describe('cold start gate', () => {
        let database: Database;
        const serverUrl = 'http://www.coldstart-categories.com';
        beforeAll(async () => {
            const server = await TestHelper.setupServerDatabase(serverUrl);
            database = server.database;
        });

        afterEach(async () => {
            cleanup();
            (useIsInitialSync as jest.Mock).mockReset();

            // Allow observables to settle before next test
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        afterAll(async () => {
            await TestHelper.tearDown();
        });

        it('should show the loader and suppress the error while initial sync is in progress', () => {
            (useIsInitialSync as jest.Mock).mockReturnValue(true);

            renderWithEverything(
                <RawCategories
                    flattenedItems={[]}
                    unreadChannelIds={new Set()}
                    onlyUnreads={false}
                    isTablet={false}
                    listHeight={0}
                />,
                {database, serverUrl},
            );

            expect(screen.getByTestId('categories.loading')).toBeVisible();
            expect(screen.queryByText('There was a problem loading content for this server.')).toBeNull();
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
});
