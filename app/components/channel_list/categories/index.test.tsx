// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Category from './index';

import type Database from '@nozbe/watermelondb/Database';

const channels: TempoChannel[] = [
    {id: '1', name: 'Just a channel'},
    {id: '2', name: 'Highlighted!!!', highlight: true},
];

const categories: TempoCategory[] = [
    {id: '1', title: 'My first Category', channels},
    {id: '2', title: 'Another cat', channels},
];

describe('Category List Component ', () => {
    let database: Database | undefined;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    test('should match snapshot', () => {
        const {toJSON} = renderWithEverything(
            <Category categories={categories}/>,
            {database},
        );

        expect(toJSON()).toMatchSnapshot();
    });
});
