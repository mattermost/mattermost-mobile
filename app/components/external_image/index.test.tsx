// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';

import ExternalImage from './external_image';

import EnhancedExternalImage from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./external_image', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ExternalImage).mockImplementation(
    (props) => React.createElement('ExternalImage', {testID: 'external-image', ...props}),
);

describe('EnhancedExternalImage (withObservables and withDatabase)', () => {
    let database: Database;
    let operator: ServerDataOperator;
    const serverUrl = 'https://server-url.com';

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof EnhancedExternalImage> {
        return {
            children: jest.fn(() => null),
            src: 'https://example.com/image.png',
        };
    }

    it('should pass default config values when not set in the database', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <EnhancedExternalImage {...props}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('external-image');
            expect(component.props.enableSVGs).toBe(false);
            expect(component.props.hasImageProxy).toBe(false);
        });
    });

    it('should pass config values from the database', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'EnableSVGs', value: 'true'},
                {id: 'HasImageProxy', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <EnhancedExternalImage {...props}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            const component = getByTestId('external-image');
            expect(component.props.enableSVGs).toBe(true);
            expect(component.props.hasImageProxy).toBe(true);
        });
    });

    it('should update when config values change', async () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <EnhancedExternalImage {...props}/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            expect(getByTestId('external-image').props.enableSVGs).toBe(false);
        });

        await act(async () => {
            await operator.handleConfigs({
                configs: [{id: 'EnableSVGs', value: 'true'}],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            expect(getByTestId('external-image').props.enableSVGs).toBe(true);
        });
    });
});
