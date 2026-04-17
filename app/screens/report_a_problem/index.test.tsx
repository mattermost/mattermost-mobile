// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import {act, waitFor} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';
import {View, Text} from 'react-native';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import ReportProblem from './report_problem';

import enhanced from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {ReportAProblemMetadata} from '@typings/screens/report_a_problem';

jest.mock('./report_problem', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ReportProblem).mockImplementation((props) => {
    return (
        <View>
            {Object.keys(props).map((key) => {
                if (key === 'metadata') {
                    return Object.keys(props[key]).map((metadataKey) => (
                        <Text
                            key={`metadata.${metadataKey}`}
                            testID={`metadata.${metadataKey}`}
                        >{`${props.metadata[metadataKey as keyof ReportAProblemMetadata]}`}</Text>
                    ));
                }

                return (
                    <Text
                        key={key}
                        testID={key}
                    >{`${props[key as keyof ComponentProps<typeof ReportProblem>]}`}</Text>
                );
            })}
        </View>
    );
});

describe('screens/report_a_problem/index', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should handle default values', async () => {
        const Component = enhanced;
        const {getByTestId} = renderWithEverything(<Component componentId={'ReportProblem'}/>, {database});

        expect(getByTestId('metadata.currentUserId')).toHaveTextContent('');
        expect(getByTestId('metadata.currentTeamId')).toHaveTextContent('');
        expect(getByTestId('metadata.serverVersion')).toHaveTextContent('Unknown (Build Unknown)');
        expect(getByTestId('metadata.appVersion')).toHaveTextContent('0.0.0 (Build 0)');
        expect(getByTestId('metadata.appPlatform')).toHaveTextContent('ios');
        expect(getByTestId('reportAProblemType')).toHaveTextContent('undefined');
        expect(getByTestId('reportAProblemMail')).toHaveTextContent('undefined');
        expect(getByTestId('reportAProblemLink')).toHaveTextContent('undefined');
        expect(getByTestId('siteName')).toHaveTextContent('undefined');
        expect(getByTestId('allowDownloadLogs')).toHaveTextContent('true');
        expect(getByTestId('isLicensed')).toHaveTextContent('false');
        expect(getByTestId('attachLogsEnabled')).toHaveTextContent('false');
        expect(getByTestId('currentUserId')).toHaveTextContent('');
    });

    it('should enhance ReportProblem with correct observables', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'ReportAProblemType', value: 'email'},
                {id: 'ReportAProblemMail', value: 'test@example.com'},
                {id: 'ReportAProblemLink', value: 'https://example.com'},
                {id: 'SiteName', value: 'Test Site'},
                {id: 'AllowDownloadLogs', value: 'true'},
                {id: 'Version', value: '7.8.0'},
                {id: 'BuildNumber', value: '123'},
            ],
            prepareRecordsOnly: false,
            configsToDelete: [],
        });

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'false'}},
                {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user1'},
                {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'team1'},
            ],
            prepareRecordsOnly: false,
        });

        await operator.handlePreferences({
            preferences: [{
                user_id: 'user1',
                category: 'advanced_settings',
                name: 'attach_app_logs',
                value: 'true',
            }],
            prepareRecordsOnly: false,
        });

        const Component = enhanced;
        const {getByTestId} = renderWithEverything(<Component componentId={'ReportProblem'}/>, {database});

        expect(getByTestId('metadata.currentUserId')).toHaveTextContent('user1');
        expect(getByTestId('metadata.currentTeamId')).toHaveTextContent('team1');
        expect(getByTestId('metadata.serverVersion')).toHaveTextContent('7.8.0 (Build 123)');
        expect(getByTestId('metadata.appVersion')).toHaveTextContent('0.0.0 (Build 0)');
        expect(getByTestId('metadata.appPlatform')).toHaveTextContent('ios');
        expect(getByTestId('reportAProblemType')).toHaveTextContent('email');
        expect(getByTestId('reportAProblemMail')).toHaveTextContent('test@example.com');
        expect(getByTestId('reportAProblemLink')).toHaveTextContent('https://example.com');
        expect(getByTestId('siteName')).toHaveTextContent('Test Site');
        expect(getByTestId('allowDownloadLogs')).toHaveTextContent('true');
        expect(getByTestId('isLicensed')).toHaveTextContent('false');
        expect(getByTestId('attachLogsEnabled')).toHaveTextContent('true');
        expect(getByTestId('currentUserId')).toHaveTextContent('user1');
    });

    it('different data should show different values', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'ReportAProblemType', value: 'link'},
                {id: 'ReportAProblemMail', value: 'test2@example.com'},
                {id: 'ReportAProblemLink', value: 'https://example2.com'},
                {id: 'SiteName', value: 'Test Site2'},
                {id: 'AllowDownloadLogs', value: 'false'},
                {id: 'Version', value: '7.8.1'},
                {id: 'BuildNumber', value: '124'},
            ],
            prepareRecordsOnly: false,
            configsToDelete: [],
        });

        await operator.handleSystem({
            systems: [
                {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'false'}},
                {id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'user2'},
                {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'team2'},
            ],
            prepareRecordsOnly: false,
        });

        const Component = enhanced;
        const {getByTestId} = renderWithEverything(<Component componentId={'ReportProblem'}/>, {database});

        expect(getByTestId('metadata.currentUserId')).toHaveTextContent('user2');
        expect(getByTestId('metadata.currentTeamId')).toHaveTextContent('team2');
        expect(getByTestId('metadata.serverVersion')).toHaveTextContent('7.8.1 (Build 124)');
        expect(getByTestId('metadata.appVersion')).toHaveTextContent('0.0.0 (Build 0)');
        expect(getByTestId('metadata.appPlatform')).toHaveTextContent('ios');
        expect(getByTestId('reportAProblemType')).toHaveTextContent('link');
        expect(getByTestId('reportAProblemMail')).toHaveTextContent('test2@example.com');
        expect(getByTestId('reportAProblemLink')).toHaveTextContent('https://example2.com');
        expect(getByTestId('siteName')).toHaveTextContent('Test Site2');
        expect(getByTestId('allowDownloadLogs')).toHaveTextContent('false');
        expect(getByTestId('isLicensed')).toHaveTextContent('false');
        expect(getByTestId('attachLogsEnabled')).toHaveTextContent('false');
        expect(getByTestId('currentUserId')).toHaveTextContent('user2');
    });

    it('should react to attachLogsEnabled preference value changes', async () => {
        await operator.handlePreferences({
            preferences: [{
                user_id: 'user1',
                category: 'advanced_settings',
                name: 'attach_app_logs',
                value: 'true',
            }],
            prepareRecordsOnly: false,
        });

        const Component = enhanced;
        const {getByTestId} = renderWithEverything(<Component componentId={'ReportProblem'}/>, {database});

        // * Initially true
        expect(getByTestId('attachLogsEnabled')).toHaveTextContent('true');

        // # Update the existing preference value from 'true' to 'false'
        await act(async () => {
            await operator.handlePreferences({
                preferences: [{
                    user_id: 'user1',
                    category: 'advanced_settings',
                    name: 'attach_app_logs',
                    value: 'false',
                }],
                prepareRecordsOnly: false,
            });
        });

        // * Should react to the value change
        await waitFor(() => {
            expect(getByTestId('attachLogsEnabled')).toHaveTextContent('false');
        });
    });
});
