// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import React from 'react';

import {MM_TABLES} from '@constants/database';
import {DEFAULT_LOCALE} from '@i18n';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CategoryBody from '.';

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';

const {SERVER: {CATEGORY}} = MM_TABLES;

jest.mock('@queries/servers/categories', () => {
    const Queries = jest.requireActual('@queries/servers/categories');
    const switchMap = jest.requireActual('rxjs/operators').switchMap;
    const mQ = jest.requireActual('@nozbe/watermelondb').Q;

    return {
        ...Queries,
        observeChannelsByCategoryChannelSortOrder: (database: Database, category: CategoryModel, excludeIds?: string[]) => {
            return category.categoryChannelsBySortOrder.observeWithColumns(['sort_order']).pipe(
                switchMap((categoryChannels: CategoryChannelModel[]) => {
                    const ids = categoryChannels.filter((cc) => excludeIds?.includes(cc.channelId)).map((cc) => cc.channelId);
                    return database.get<ChannelModel>('Channel').query(mQ.where('id', mQ.oneOf(ids))).observe();
                }),
            );
        },
    };
});

describe('components/channel_list/categories/body', () => {
    let database: Database;
    let category: CategoryModel;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;

        const categories = await database.get<CategoryModel>(CATEGORY).query(
            Q.take(1),
        ).fetch();

        category = categories[0];
    });

    it('should match snapshot', (done) => {
        const wrapper = renderWithEverything(
            <CategoryBody
                category={category}
                locale={DEFAULT_LOCALE}
                isTablet={false}
                onChannelSwitch={() => undefined}
            />,
            {database},
        );

        setTimeout(() => {
            expect(wrapper.toJSON()).toBeTruthy();
            done();
        });
    });
});
