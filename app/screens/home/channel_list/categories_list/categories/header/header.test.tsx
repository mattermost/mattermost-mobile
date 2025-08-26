// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import React from 'react';

import {MM_TABLES} from '@constants/database';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CategoryHeader from './header';

import type CategoryModel from '@typings/database/models/servers/category';

describe('components/channel_list/categories/header', () => {
    let database: Database;
    let category: CategoryModel;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();

        database = server.database;
        const categories = await database.get<CategoryModel>(MM_TABLES.SERVER.CATEGORY).query(
            Q.take(1),
        ).fetch();

        category = categories[0];
    });

    // Skipping this test because the snapshot became too big and
    // it errors out.
    it.skip('should match snapshot', () => {
        const wrapper = renderWithIntlAndTheme(
            <CategoryHeader
                category={category}
                hasChannels={true}
            />,
        );
        expect(wrapper.toJSON()).toMatchSnapshot();
    });
});
