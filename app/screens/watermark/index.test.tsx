// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything, act} from '@test/intl-test-helper';
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

    it('should render watermark text containing username and domain', async () => {
        const {getAllByText} = renderWithEverything(
            <WatermarkScreenExport componentId='Watermark'/>,
            {database, serverUrl},
        );

        // The watermark renders its text multiple times (grid pattern).
        // Verify at least one instance of the domain is present.
        await act(async () => {
            // Allow observables to emit
        });

        // Domain extracted from serverUrl should be in the watermark text
        const items = getAllByText(/www\.someserver\.com/);
        expect(items.length).toBeGreaterThan(0);
    });

    it('should render multiple copies of the watermark text for the grid pattern', async () => {
        const {getAllByText} = renderWithEverything(
            <WatermarkScreenExport componentId='Watermark'/>,
            {database, serverUrl},
        );

        await act(async () => {
            // Allow observables to emit
        });

        // The watermark renders a grid of repeated text — expect more than one copy
        const items = getAllByText(/www\.someserver\.com/);
        expect(items.length).toBeGreaterThan(1);
    });
});
