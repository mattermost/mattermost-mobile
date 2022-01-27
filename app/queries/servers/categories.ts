// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Q} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type CategoryModel from '@typings/database/models/servers/category';

export const queryCategoryById = async (database: Database, categoryId: string) => {
    try {
        const record = (await database.collections.get(MM_TABLES.SERVER.CATEGORY).find(categoryId)) as CategoryModel;
        return record;
    } catch {
        return undefined;
    }
};

export const queryCategoriesById = async (database: Database, categoryIds: string[]): Promise<CategoryModel[]> => {
    try {
        const records = (await database.get(MM_TABLES.SERVER.CATEGORY).query(Q.where('id', Q.oneOf(categoryIds))).fetch()) as CategoryModel[];
        return records;
    } catch {
        return Promise.resolve([] as CategoryModel[]);
    }
};

export const queryCategoriesByType = async (database: Database, type: CategoryType): Promise<CategoryModel[]> => {
    try {
        const records = (await database.get(MM_TABLES.SERVER.CATEGORY).query(Q.where('type', type)).fetch()) as CategoryModel[];
        return records;
    } catch {
        return Promise.resolve([] as CategoryModel[]);
    }
};

export const queryCategoriesByTeamId = async (database: Database, teamId: string): Promise<CategoryModel[]> => {
    try {
        const records = (await database.get(MM_TABLES.SERVER.CATEGORY).query(Q.where('team_id', teamId)).fetch()) as CategoryModel[];
        return records;
    } catch {
        return Promise.resolve([] as CategoryModel[]);
    }
};

export const queryCategoriesByUserId = async (database: Database, userId: string): Promise<CategoryModel[]> => {
    try {
        const records = (await database.get(MM_TABLES.SERVER.CATEGORY).query(Q.where('user_id', userId)).fetch()) as CategoryModel[];
        return records;
    } catch {
        return Promise.resolve([] as CategoryModel[]);
    }
};

export const queryCategoriesByTeamIdUserId = async (database: Database, teamId: string, userId: string): Promise<CategoryModel[]> => {
    try {
        const records = (await database.get(MM_TABLES.SERVER.CATEGORY).query(Q.where('team_id', teamId), Q.where('user_id', userId)).fetch()) as CategoryModel[];
        return records;
    } catch {
        return Promise.resolve([] as CategoryModel[]);
    }
};

export const queryCategoriesByTypeTeamIdUserId = async (database: Database, type: CategoryType, teamId: string, userId: string): Promise<CategoryModel[]> => {
    try {
        const records = (await database.get(MM_TABLES.SERVER.CATEGORY).query(
            Q.where('team_id', teamId),
            Q.where('user_id', userId),
            Q.where('type', type),
        ).fetch()) as CategoryModel[];
        return records;
    } catch {
        return Promise.resolve([] as CategoryModel[]);
    }
};

export const queryAllCategories = async (database: Database): Promise<CategoryModel[]> => {
    try {
        const records = (await database.get(MM_TABLES.SERVER.CATEGORY).query().fetch()) as CategoryModel[];
        return records;
    } catch {
        return Promise.resolve([] as CategoryModel[]);
    }
};

export const prepareCategories = (operator: ServerDataOperator, categories: CategoryWithChannels[]) => {
    try {
        const categoryRecords = operator.handleCategories({categories, prepareRecordsOnly: true});
        return [categoryRecords];
    } catch {
        return undefined;
    }
};

export const prepareCategoryChannels = (
    operator: ServerDataOperator,
    categories: CategoryWithChannels[],
) => {
    try {
        const categoryChannels: CategoryChannel[] = [];

        categories.forEach((category) => {
            category.channel_ids.forEach((channelId, index) => {
                categoryChannels.push({
                    id: `${category.team_id}_${channelId}`,
                    category_id: category.id,
                    channel_id: channelId,
                    sort_order: index,
                });
            });
        });

        const categoryChannelRecords = operator.handleCategoryChannels({categoryChannels, prepareRecordsOnly: true});

        return [categoryChannelRecords];
    } catch (e) {
        return undefined;
    }
};
