// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';
import {
    transformCategoryChannelRecord,
    transformCategoryRecord,
} from '@database/operator/server_data_operator/transformers/category';
import {getUniqueRawsBy} from '@database/operator/utils/general';
import {logWarning} from '@utils/log';

import type ServerDataOperatorBase from '.';
import type {
    HandleCategoryChannelArgs,
    HandleCategoryArgs,
} from '@typings/database/database';
import type CategoryModel from '@typings/database/models/servers/category';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';

const {
    CATEGORY,
    CATEGORY_CHANNEL,
} = MM_TABLES.SERVER;

export interface CategoryHandlerMix {
    handleCategoryChannels: ({categoryChannels, prepareRecordsOnly}: HandleCategoryChannelArgs) => Promise<CategoryChannelModel[]>;
    handleCategories: ({categories, prepareRecordsOnly}: HandleCategoryArgs) => Promise<CategoryModel[]>;
}

const CategoryHandler = <TBase extends Constructor<ServerDataOperatorBase>>(superclass: TBase) => class extends superclass {
    /**
     * handleCategories: Handler responsible for the Create/Update operations occurring on the Category table from the 'Server' schema
     * @param {HandleCategoryArgs} categoriesArgs
     * @param {Category[]} categoriesArgs.categories
     * @param {boolean} categoriesArgs.prepareRecordsOnly
     * @returns {Promise<CategoryModel[]>}
     */
    handleCategories = async ({categories, prepareRecordsOnly = true}: HandleCategoryArgs): Promise<CategoryModel[]> => {
        if (!categories?.length) {
            logWarning(
                'An empty or undefined "categories" array has been passed to the handleCategories method',
            );
            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: categories, key: 'id'}) as Category[];
        const ids = uniqueRaws.map((c) => c.id);
        const db: Database = this.database;
        const exists = await db.get<CategoryModel>(CATEGORY).query(
            Q.where('id', Q.oneOf(ids)),
        ).fetch();
        const categoryMap = new Map<string, CategoryModel>(exists.map((c) => [c.id, c]));
        const createOrUpdateRawValues = uniqueRaws.reduce((res: Category[], c) => {
            const e = categoryMap.get(c.id);
            if (!e) {
                res.push(c);
            } else if (
                e.displayName !== c.display_name ||
                e.muted !== c.muted ||
                e.sortOrder !== (c.sort_order / 10) ||
                e.sorting !== (c.sorting || 'recent') ||
                e.teamId !== c.team_id ||
                e.type !== c.type
            ) {
                res.push(c);
            }
            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformCategoryRecord,
            createOrUpdateRawValues,
            tableName: CATEGORY,
            prepareRecordsOnly,
        }, 'handleCategories');
    };

    /**
     * handleCategoryChannels: Handler responsible for the Create/Update operations occurring on the CategoryChannel table from the 'Server' schema
     * @param {HandleCategoryChannelArgs} categoriesArgs
     * @param {CategoryChannel[]} categoriesArgs.categoryChannels
     * @param {boolean} categoriesArgs.prepareRecordsOnly
     * @returns {Promise<CategoryChannelModel[]>}
     */
    handleCategoryChannels = async ({categoryChannels, prepareRecordsOnly = true}: HandleCategoryChannelArgs): Promise<CategoryChannelModel[]> => {
        if (!categoryChannels?.length) {
            logWarning(
                'An empty or undefined "categoryChannels" array has been passed to the handleCategories method',
            );

            return [];
        }

        const uniqueRaws = getUniqueRawsBy({raws: categoryChannels, key: 'id'}) as CategoryChannel[];
        const ids = uniqueRaws.map((c) => c.id).filter((id): id is string => id !== undefined);
        const db: Database = this.database;
        const exists = await db.get<CategoryChannelModel>(CATEGORY_CHANNEL).query(
            Q.where('id', Q.oneOf(ids)),
        ).fetch();
        const categoryChannelMap = new Map<string, CategoryChannelModel>(exists.map((c) => [c.id, c]));
        const createOrUpdateRawValues = uniqueRaws.reduce((res: CategoryChannel[], c) => {
            if (!c.id) {
                return res;
            }
            const e = categoryChannelMap.get(c.id);
            if (!e) {
                res.push(c);
            } else if (
                e.categoryId !== c.category_id ||
                e.channelId !== c.channel_id ||
                e.sortOrder !== c.sort_order
            ) {
                res.push(c);
            }
            return res;
        }, []);

        if (!createOrUpdateRawValues.length) {
            return [];
        }

        return this.handleRecords({
            fieldName: 'id',
            transformer: transformCategoryChannelRecord,
            createOrUpdateRawValues,
            tableName: CATEGORY_CHANNEL,
            prepareRecordsOnly,
        }, 'handleCategoryChannels');
    };
};

export default CategoryHandler;
