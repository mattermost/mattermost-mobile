// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import React, {type ComponentProps} from 'react';
import {View, Text} from 'react-native';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';

import ReportProblem from './report_problem';

import enhanced from './index';

jest.mock('./report_problem', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ReportProblem).mockImplementation((props) => {
    return (
        <View>
            {Object.keys(props).map((key) => (
                <Text
                    key={key}
                    testID={key}
                >{`${props[key as keyof ComponentProps<typeof ReportProblem>]}`}</Text>
            ))}
        </View>
    );
});

describe('screens/settings/report_problem/index', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should handle default values', async () => {
        const Component = enhanced;
        const {getByTestId} = renderWithEverything(
            <Component/>,
            {database},
        );

        expect(getByTestId('reportAProblemType')).toHaveTextContent('undefined');
        expect(getByTestId('allowDownloadLogs')).toHaveTextContent('true');
    });

    it('should enhance ReportProblem with correct observables', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleConfigs({
            configs: [
                {id: 'ReportAProblemType', value: 'link'},
                {id: 'AllowDownloadLogs', value: 'false'},
            ],
            prepareRecordsOnly: false,
            configsToDelete: [],
        });

        const Component = enhanced;
        const {getByTestId} = renderWithEverything(
            <Component/>,
            {database},
        );

        expect(getByTestId('reportAProblemType')).toHaveTextContent('link');
        expect(getByTestId('allowDownloadLogs')).toHaveTextContent('false');
    });
});
