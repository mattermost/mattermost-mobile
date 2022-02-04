// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

import {storeCategories} from '@actions/local/category';
import {fetchMyCategories} from '@actions/remote/category';
import {queryCategoriesById} from '@app/queries/servers/categories';
import DatabaseManager from '@database/manager';

const addOrUpdateCategories = async (serverUrl: string, categories: CategoryWithChannels[]) => {
    try {
        storeCategories(serverUrl, categories);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('FAILED TO BATCH CATEGORIES', e);
    }
};

export async function handleCategoryCreatedEvent(serverUrl: string, msg: any) {
    console.log('handleCategoryCreatedEvent');

    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // Add / Update Category
    addOrUpdateCategories(serverUrl, [JSON.parse(msg.data.category)]);
}

export async function handleCategoryUpdatedEvent(serverUrl: string, msg: any) {
    console.log('handleCategoryUpdatedEvent', msg);

    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // Add / Update Category
    addOrUpdateCategories(serverUrl, JSON.parse(msg.data.updatedCategories || ''));
}

export async function handleCategoryDeletedEvent(serverUrl: string, msg: any) {
    console.log('handleCategoryDeletedEvent');

    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    // Delete category, move channels?
    // Just fetch everything again...
    fetchMyCategories(serverUrl, msg.data.team_id);
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
