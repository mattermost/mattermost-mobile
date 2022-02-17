// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';
import React from 'react';

import {MM_TABLES} from '@app/constants/database';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CategoryBody from './category_body';

import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';
import type MyChannelModel from '@typings/database/models/servers/my_channel';

describe('components/channel_list/categories/body', () => {
    let database: Database;
    let category: CategoryModel;
    let categoryChannels: CategoryChannelModel[];
    let myChannels: MyChannelModel[];
    let channels: ChannelModel[];

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;

        const categories = await database.get<CategoryModel>(MM_TABLES.SERVER.CATEGORY).query(
            Q.take(1),
        ).fetch();

        category = categories[0];

        categoryChannels = await database.get<CategoryChannelModel>(MM_TABLES.SERVER.CATEGORY_CHANNEL).query(
            Q.where('category_id', category.id),
        ).fetch();

        const channelIds = await database.get<ChannelModel>(MM_TABLES.SERVER.CHANNEL).query(
            Q.on(MM_TABLES.SERVER.CATEGORY_CHANNEL, 'category_id', category.id),
        ).fetchIds();

        myChannels = await database.get<MyChannelModel>(MM_TABLES.SERVER.MY_CHANNEL).query(
            Q.where('id', Q.oneOf(channelIds)),
        ).fetch();
    });

    it('should match snapshot', () => {
        const wrapper = renderWithEverything(
            <CategoryBody
                category={category}
                myChannels={myChannels}
                categoryChannels={categoryChannels}
                channels={channels}
            />,
            {database},
        );
        expect(wrapper.toJSON()).toMatchSnapshot({
            props: {data: expect.anything()},
        });
    });
});
