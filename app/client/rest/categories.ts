// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface ClientCategoriesMix {
    getCategories: (userId: string, teamId: string) => Promise<CategoriesWithOrder>;
    getCategoriesOrder: (userId: string, teamId: string) => Promise<string[]>;
    getCategory: (userId: string, teamId: string, categoryId: string) => Promise<Category>;
    updateChannelCategories: (userId: string, teamId: string, categories: CategoryWithChannels[]) => Promise<CategoriesWithOrder>;
}

const ClientCategories = (superclass: any) => class extends superclass {
    getCategories = async (userId: string, teamId: string) => {
        return this.doFetch(
            `${this.getCategoriesRoute(userId, teamId)}`,
            {method: 'get'},
        );
    };
    getCategoriesOrder = async (userId: string, teamId: string) => {
        return this.doFetch(
            `${this.getCategoriesOrderRoute(userId, teamId)}`,
            {method: 'get'},
        );
    };
    getCategory = async (userId: string, teamId: string, categoryId: string) => {
        return this.doFetch(
            `${this.getCategoryRoute(userId, teamId, categoryId)}`,
            {method: 'get'},
        );
    };

    updateChannelCategories = async (userId: string, teamId: string, categories: CategoryWithChannels[]) => {
        return this.doFetch(
            `${this.getCategoriesRoute(userId, teamId)}`,
            {method: 'put', body: categories},
        );
    };
};

export default ClientCategories;
