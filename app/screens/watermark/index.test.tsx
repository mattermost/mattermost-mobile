// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import WatermarkScreenExport from './index';

import type {Database} from '@nozbe/watermelondb';

// The exported component is the HOC-wrapped version; we need to render it
// with full database context so withDatabase and withObservables can resolve.
describe('WatermarkScreen', () => {
    let database: Database;
    const serverUrl = 'http://www.someserver.com';

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase(serverUrl);
        database = server.database;
    });

    afterAll(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should render watermark text containing username and server URL', async () => {
        const {getAllByText} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        // The watermark container is hidden from accessibility intentionally;
        // use includeHiddenElements to still find the text in tests.
        await waitFor(() => {
            expect(getAllByText(/www\.someserver\.com/, {includeHiddenElements: true}).length).toBeGreaterThan(0);
        });
    });

    it('should render watermark text containing username, server URL, date and time', async () => {
        // Freeze Date so the watermark's "now" is deterministic.
        // Only fake Date — keep all timer APIs real so WatermelonDB observables resolve normally.
        jest.useFakeTimers({
            now: new Date('2026-04-14T10:30:00'),
            doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'queueMicrotask'],
        });

        try {
            const username = TestHelper.basicUser!.username;
            const {getAllByText} = renderWithEverything(
                <WatermarkScreenExport/>,
                {database, serverUrl},
            );

            const expectedText = `${username}  ${serverUrl}  4/14/2026  10:30 AM`;
            await waitFor(() => {
                expect(getAllByText(expectedText, {includeHiddenElements: true}).length).toBeGreaterThan(0);
            });
        } finally {
            jest.useRealTimers();
        }
    });

    it('should render multiple copies of the watermark text for the grid pattern', async () => {
        const {getAllByText} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        // The watermark renders a grid of repeated text — expect more than one copy
        await waitFor(() => {
            expect(getAllByText(/www\.someserver\.com/, {includeHiddenElements: true}).length).toBeGreaterThan(1);
        });
    });
});
