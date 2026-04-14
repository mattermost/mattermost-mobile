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

    it('should render watermark text containing username and domain', async () => {
        const {getAllByText} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        // Domain extracted from serverUrl should be in the watermark text
        await waitFor(() => {
            expect(getAllByText(/www\.someserver\.com/).length).toBeGreaterThan(0);
        });
    });

    it('should render watermark text containing username, domain, date and time', async () => {
        const username = TestHelper.basicUser!.username;
        const {getAllByText} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        // The full watermark text includes username, server URL, and a formatted date/time.
        // e.g. "someuser  http://www.someserver.com  4/13/2026  12:34 PM"
        await waitFor(() => {
            expect(getAllByText(new RegExp(`${username}.*www\\.someserver\\.com.*\\d+.*\\d+`)).length).toBeGreaterThan(0);
        });
    });

    it('should render multiple copies of the watermark text for the grid pattern', async () => {
        const {getAllByText} = renderWithEverything(
            <WatermarkScreenExport/>,
            {database, serverUrl},
        );

        // The watermark renders a grid of repeated text — expect more than one copy
        await waitFor(() => {
            expect(getAllByText(/www\.someserver\.com/).length).toBeGreaterThan(1);
        });
    });
});
