// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import ServerDataOperator from '@app/database/operator/server_data_operator';
import {prepareCategories, prepareCategoryChannels, queryCategoriesById} from '@app/queries/servers/categories';
import DatabaseManager from '@database/manager';

const addOrUpdateCategories = async (operator: ServerDataOperator, categories: CategoryWithChannels[]) => {
    try {
        const modelPromises: Array<Promise<Model[]>> = [];

        const preparedCategories = await prepareCategories(operator, categories);
        if (preparedCategories) {
            modelPromises.push(...preparedCategories);
        }
        const preparedCategoryChannels = await prepareCategoryChannels(operator, categories);
        if (preparedCategoryChannels) {
            modelPromises.push(...preparedCategoryChannels);
        }

        const models = await Promise.all(modelPromises);
        const flattenedModels = models.flat() as Model[];

        await operator.batchRecords(flattenedModels);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('FAILED TO BATCH CHANNELS', e);
    }
};

export async function handleCategoryCreatedEvent(serverUrl: string, msg: any) {
    console.log('handleCategoryCreatedEvent');

    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // Add / Update Category
    const operator = database.operator;
    addOrUpdateCategories(operator, [JSON.parse(msg.data.category)]);
}

export async function handleCategoryUpdatedEvent(serverUrl: string, msg: any) {
    console.log('handleCategoryUpdatedEvent');

    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // Add / Update Category
    const operator = database.operator;
    addOrUpdateCategories(operator, JSON.parse(msg.data.updatedCategories));
}

export async function handleCategoryDeletedEvent(serverUrl: string, msg: any) {
    console.log('handleCategoryDeletedEvent');

    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // Delete category, move channels?
    // Just fetch everything again...
    fetchMyChannelsForTeam(serverUrl, msg.data.team_id);
}

export async function handleCategoryOrderUpdatedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // Update category order
    const categories = await queryCategoriesById(database.database, msg.data.order);
    categories.forEach((c) => {
        const findOrder = (id: string) => id === c.id;
        c.prepareUpdate(() => {
            c.sortOrder = (msg.data.order as string[]).findIndex(findOrder);
        });
    });

    try {
        await database.operator.batchRecords(categories);
    } catch (e) {
        console.log('Category Order Websocket Event - Batch Update Failed', e);
    }
}
