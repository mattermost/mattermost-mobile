// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deleteCategory, storeCategories} from '@actions/local/category';
import {fetchCategories} from '@actions/remote/category';
import DatabaseManager from '@database/manager';
import {queryCategoriesById} from '@queries/servers/categories';
import {logError} from '@utils/log';

type WebsocketCategoriesMessage = {
    broadcast: {
        team_id: string;
    };
    data: {
        team_id: string;
        category?: string;
        category_id: string;
        updatedCategories?: string;
        order?: string[];
    };
}

const addOrUpdateCategories = async (serverUrl: string, categories: CategoryWithChannels[]) => {
    try {
        storeCategories(serverUrl, categories);
    } catch (e) {
        logError('Category WS: addOrUpdateCategories', e, categories);
    }
};

export async function handleCategoryCreatedEvent(serverUrl: string, msg: WebsocketCategoriesMessage) {
    let category;
    try {
        if (msg.data.category) {
            category = JSON.parse(msg.data.category);
            addOrUpdateCategories(serverUrl, [category]);
        }
    } catch (e) {
        logError('Category WS: handleCategoryCreatedEvent', e, msg);

        if (msg.broadcast.team_id) {
            fetchCategories(serverUrl, msg.broadcast.team_id);
        }
    }
}

export async function handleCategoryUpdatedEvent(serverUrl: string, msg: WebsocketCategoriesMessage) {
    let categories;

    try {
        if (msg?.data?.updatedCategories) {
            categories = JSON.parse(msg.data.updatedCategories);
            addOrUpdateCategories(serverUrl, categories);
        }
    } catch (e) {
        logError('Category WS: handleCategoryUpdatedEvent', e, msg);
        if (msg.broadcast.team_id) {
            fetchCategories(serverUrl, msg.broadcast.team_id, true);
        }
    }
}

export async function handleCategoryDeletedEvent(serverUrl: string, msg: WebsocketCategoriesMessage) {
    try {
        if (msg.data.category_id) {
            // Delete the Category
            await deleteCategory(serverUrl, msg.data.category_id);
        }

        if (msg.broadcast.team_id) {
            // Fetch the categories again as channels will have moved
            fetchCategories(serverUrl, msg.broadcast.team_id);
        }
    } catch (e) {
        logError('Category WS: handleCategoryDeletedEvent', e, msg);
    }
}

export async function handleCategoryOrderUpdatedEvent(serverUrl: string, msg: WebsocketCategoriesMessage) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Update category order
        if (msg.data.order?.length) {
            const order = msg.data.order;
            const categories = await queryCategoriesById(database, order).fetch();
            categories.forEach((c) => {
                const findOrder = (id: string) => id === c.id;
                c.prepareUpdate(() => {
                    c.sortOrder = order.findIndex(findOrder);
                });
            });
            await operator.batchRecords(categories, 'handleCategoryOrderUpdatedEvent');
        }
    } catch (e) {
        logError('Category WS: handleCategoryOrderUpdatedEvent', e, msg);

        if (msg.broadcast.team_id) {
            fetchCategories(serverUrl, msg.data.team_id);
        }
    }
}
