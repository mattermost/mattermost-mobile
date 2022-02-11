// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {fetchCategories} from '@actions/remote/category';
import DatabaseManager from '@database/manager';
import {queryCategoriesById} from '@queries/servers/categories';

type WebsocketMessage = {
    data: {
        team_id: string;
        category?: string;
        updatedCategories?: string;
        order?: string[];
    };
}

const addOrUpdateCategories = async (serverUrl: string, categories: CategoryWithChannels[]) => {
    try {
        storeCategories(serverUrl, categories);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Category WS: addOrUpdateCategories', e, categories);
    }
};

export async function handleCategoryCreatedEvent(serverUrl: string, msg: WebsocketMessage) {
    let category;
    try {
        category = JSON.parse(msg.data.category!);
        addOrUpdateCategories(serverUrl, [category]);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Category WS: handleCategoryCreatedEvent', e, msg);
        fetchCategories(serverUrl, msg.data.team_id);
    }
}

export async function handleCategoryUpdatedEvent(serverUrl: string, msg: WebsocketMessage) {
    let categories;

    try {
        categories = JSON.parse(msg.data.updatedCategories!);
        addOrUpdateCategories(serverUrl, categories);
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Category WS: handleCategoryUpdatedEvent', e, msg);
        fetchCategories(serverUrl, msg.data.team_id);
    }
}

export async function handleCategoryDeletedEvent(serverUrl: string, msg: WebsocketMessage) {
    // Just fetch and update everything again.
    fetchCategories(serverUrl, msg.data.team_id);
}

export async function handleCategoryOrderUpdatedEvent(serverUrl: string, msg: WebsocketMessage) {
    try {
        const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;

        if (!operator) {
            return;
        }

        const {database} = operator;

        // Update category order
        if (msg.data.order?.length) {
            const order = msg.data.order;
            const categories = await queryCategoriesById(database, order);
            categories.forEach((c) => {
                const findOrder = (id: string) => id === c.id;
                c.prepareUpdate(() => {
                    c.sortOrder = order.findIndex(findOrder);
                });
            });
            await operator.batchRecords(categories);
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Category WS: handleCategoryOrderUpdatedEvent', e, msg);
        fetchCategories(serverUrl, msg.data.team_id);
    }
}
