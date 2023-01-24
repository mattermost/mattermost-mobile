// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {act} from 'react-test-renderer';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Categories from '.';

import type Database from '@nozbe/watermelondb/Database';

describe('components/channel_list/categories', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('render without error', () => {
        jest.useFakeTimers();
        const wrapper = renderWithEverything(
            <Categories/>,
            {database},
        );

        act(() => jest.runAllTimers());

        expect(wrapper.toJSON()).toBeTruthy();
        jest.useRealTimers();
    });
});
