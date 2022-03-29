// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model, Q, Query} from '@nozbe/watermelondb';

import {MM_TABLES} from '@constants/database';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type CategoryModel from '@typings/database/models/servers/category';

const {SERVER: {CATEGORY}} = MM_TABLES;

export const getCategoryById = async (database: Database, categoryId: string) => {
    try {
        const record = (await database.collections.get<CategoryModel>(CATEGORY).find(categoryId));
        return record;
    } catch {
        return undefined;
    }
};

export const queryCategoriesById = (database: Database, categoryIds: string[]) => {
    return database.get<CategoryModel>(CATEGORY).query(Q.where('id', Q.oneOf(categoryIds)));
};

export const queryCategoriesByTeamIds = (database: Database, teamIds: string[]) => {
    return database.get<CategoryModel>(CATEGORY).query(Q.where('team_id', Q.oneOf(teamIds)));
};

export const prepareCategories = (operator: ServerDataOperator, categories: CategoryWithChannels[]) => {
    return operator.handleCategories({categories, prepareRecordsOnly: true});
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

        if (categoryChannels.length) {
            return operator.handleCategoryChannels({categoryChannels, prepareRecordsOnly: true});
        }

        return undefined;
    } catch (e) {
        return undefined;
    }
};

export const prepareDeleteCategory = async (category: CategoryModel): Promise<Model[]> => {
    const preparedModels: Model[] = [category.prepareDestroyPermanently()];

    const associatedChildren: Array<Query<Model>|undefined> = [
        category.categoryChannels,
    ];
    await Promise.all(associatedChildren.map(async (children) => {
        const models = await children?.fetch();
        models?.forEach((model) => preparedModels.push(model.prepareDestroyPermanently()));
    }));

    return preparedModels;
};
