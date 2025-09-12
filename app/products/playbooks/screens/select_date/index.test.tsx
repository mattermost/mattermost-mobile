// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SelectDate from './select_date';

import SelectDateEnhanced from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {AvailableScreens} from '@typings/screens/navigation';

// Mock dependencies
jest.mock('./select_date', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SelectDate).mockImplementation(
    (props) => React.createElement('SelectDate', {testID: 'select_date', ...props}),
);

describe('SelectDate Enhanced Component', () => {
    const serverUrl = 'server-url';

    let database: Database;
    let operator: ServerDataOperator;

    function getBaseProps(): ComponentProps<typeof SelectDateEnhanced> {
        return {
            componentId: 'SelectDate' as AvailableScreens,
            selectedDate: undefined,
            onSave: jest.fn(),
        };
    }

    async function addUserToDatabase(user: UserProfile) {
        await operator.handleUsers({
            prepareRecordsOnly: false,
            users: [user],
        });
    }

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'currentUser'}], prepareRecordsOnly: false});
        jest.clearAllMocks();
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('with database integration', () => {
        it('should render enhanced component with currentUserTimezone from database', async () => {
            const user = TestHelper.fakeUser({
                id: 'currentUser',
                timezone: {
                    useAutomaticTimezone: false,
                    manualTimezone: 'America/New_York',
                    automaticTimezone: 'America/New_York',
                },
            });
            await addUserToDatabase(user);

            const props = getBaseProps();

            const {getByTestId} = renderWithEverything(<SelectDateEnhanced {...props}/>, {database});

            const selectDate = getByTestId('select_date');
            expect(selectDate).toBeTruthy();
            expect(selectDate).toHaveProp('currentUserTimezone', expect.objectContaining({
                useAutomaticTimezone: false,
                manualTimezone: 'America/New_York',
                automaticTimezone: 'America/New_York',
            }));
        });

        it('should handle timezone changes through observable', async () => {
            const user = TestHelper.fakeUser({
                id: 'currentUser',
                timezone: {
                    useAutomaticTimezone: false,
                    manualTimezone: 'America/New_York',
                    automaticTimezone: 'America/New_York',
                },
            });
            await addUserToDatabase(user);

            const props = getBaseProps();

            const {getByTestId} = renderWithEverything(<SelectDateEnhanced {...props}/>, {database});

            const selectDate = getByTestId('select_date');
            expect(selectDate).toHaveProp('currentUserTimezone', expect.objectContaining({
                manualTimezone: 'America/New_York',
            }));

            // Update user timezone
            await act(async () => {
                database.write(async () => {
                    const userRecord = await database.get('User').find('currentUser');
                    userRecord.update((u) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (u as any).timezone = {
                            useAutomaticTimezone: true,
                            manualTimezone: '',
                            automaticTimezone: 'Europe/London',
                        };
                    });
                });
            });

            await waitFor(() => {
                expect(selectDate).toHaveProp('currentUserTimezone', expect.objectContaining({
                    useAutomaticTimezone: true,
                    manualTimezone: '',
                    automaticTimezone: 'Europe/London',
                }));
            });
        });

        it('should handle missing current user gracefully', async () => {
            const props = getBaseProps();

            const {getByTestId} = renderWithEverything(<SelectDateEnhanced {...props}/>, {database});

            const selectDate = getByTestId('select_date');
            expect(selectDate).toBeTruthy();
            expect(selectDate.props.currentUserTimezone).toBeUndefined();
        });

        it('should handle user without timezone gracefully', async () => {
            const user = TestHelper.fakeUser({
                id: 'currentUser',
                timezone: undefined,
            });
            await addUserToDatabase(user);

            const props = getBaseProps();

            const {getByTestId} = renderWithEverything(<SelectDateEnhanced {...props}/>, {database});

            const selectDate = getByTestId('select_date');
            expect(selectDate).toBeTruthy();
            expect(selectDate.props.currentUserTimezone).toBeUndefined();
        });
    });
});
