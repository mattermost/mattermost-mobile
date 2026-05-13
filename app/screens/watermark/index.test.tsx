// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import WatermarkScreenExport from './index';

import type {Database} from '@nozbe/watermelondb';

// Portal renders children into a named host declared in _layout.tsx.
// In unit tests there is no host, so we render children directly.
jest.mock('@gorhom/portal', () => {
    const React = require('react');
    const {View} = require('react-native');
    return {
        Portal: ({children}: {children: React.ReactNode}) => React.createElement(View, {testID: 'portal'}, children),
    };
});

// FullWindowOverlay is a native component — render children passthrough in tests.
jest.mock('react-native-screens', () => {
    const React = require('react');
    return {
        FullWindowOverlay: ({children}: {children: React.ReactNode}) => React.createElement(React.Fragment, null, children),
    };
});

describe('WatermarkScreen', () => {
    let database: Database;
    const serverUrl = 'http://www.someserver.com';

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        await DatabaseManager.updateServerIdentifier(serverUrl, 'someidentifier');
        await DatabaseManager.setActiveServerDatabase(serverUrl);
        database = server.database;
    });

    afterAll(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should render nothing when watermark is disabled', async () => {
        const {queryByTestId} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        // Give observables time to resolve — the portal should never appear.
        await waitFor(() => {
            expect(queryByTestId('portal')).toBeNull();
        });
    });

    it('should render watermark text containing username and server URL when enabled', async () => {
        // Enable the watermark via the system config in the DB.
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalEnableWatermark', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const {getAllByText, unmount} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        // The watermark container is hidden from accessibility intentionally;
        // use includeHiddenElements to still find the text in tests.
        await waitFor(() => {
            expect(getAllByText(/www\.someserver\.com/, {includeHiddenElements: true}).length).toBeGreaterThan(0);
        });

        // Unmount before resetting config to avoid act() warnings from post-unmount observable updates.
        unmount();
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalEnableWatermark', value: 'false'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    it('should render multiple copies of the watermark text for the tiled grid pattern when enabled', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalEnableWatermark', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const {getAllByText, unmount} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        await waitFor(() => {
            expect(getAllByText(/www\.someserver\.com/, {includeHiddenElements: true}).length).toBeGreaterThan(1);
        });

        unmount();
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalEnableWatermark', value: 'false'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    it('should render watermark text with username, server URL, date and time when enabled', async () => {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalEnableWatermark', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        // Freeze Date so the watermark's "now" is deterministic.
        // Only fake Date — keep all timer APIs real so WatermelonDB observables resolve normally.
        jest.useFakeTimers({
            now: new Date('2026-04-14T10:30:00'),
            doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask'],
        });

        let unmount: () => void;
        try {
            const username = TestHelper.basicUser!.username;
            const rendered = renderWithEverything(
                <WatermarkScreenExport/>,
                {database, serverUrl},
            );
            unmount = rendered.unmount;

            const expectedText = `${username}  ${serverUrl}  4/14/2026  10:30 AM`;
            await waitFor(() => {
                expect(rendered.getAllByText(expectedText, {includeHiddenElements: true}).length).toBeGreaterThan(0);
            });
        } finally {
            unmount!();
            jest.useRealTimers();
            await operator.handleConfigs({
                configs: [{id: 'ExperimentalEnableWatermark', value: 'false'}],
                configsToDelete: [],
                prepareRecordsOnly: false,
            });
        }
    });
});
