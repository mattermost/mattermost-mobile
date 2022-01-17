// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Threads from './index';

import type Database from '@nozbe/watermelondb/Database';

describe('Threads Component', () => {
    let database: Database | undefined;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    test('should match snapshot', () => {
        const {toJSON} = renderWithEverything(
            <Threads/>,
            {database},
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
