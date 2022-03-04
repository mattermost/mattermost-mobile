// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Categories from './';

describe('components/channel_list/categories', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('render without error', () => {
        const wrapper = renderWithEverything(
            <Categories currentTeamId={TestHelper.basicTeam!.id}/>,
            {database},
        );

        expect(wrapper.toJSON()).toBeTruthy();
    });
});
