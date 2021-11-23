// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export interface ClientCategoriesMix {
    getCategories: (teamId: string, userId: string) => Promise<Categories>;
    getCategoriesOrder: (teamId: string, userId: string) => Promise<CategoriesOrder>;
    getCategory: (teamId: string, userId: string, categoryId: string) => Promise<Category>;
}

const ClientCategories = (superclass: any) => class extends superclass {
    getCategories = async (teamId: string, userId: string) => {
        return this.doFetch(
            `${this.getCategoriesRoute(teamId, userId)}`,
            {method: 'get'},
        );
    };
    getCategoriesOrder = async (teamId: string, userId: string) => {
        return this.doFetch(
            `${this.getCategoriesOrderRoute(teamId, userId)}`,
            {method: 'get'},
        );
    };
    getCategory = async (teamId: string, userId: string, categoryId: string) => {
        return this.doFetch(
            `${this.getCategoryRoute(teamId, userId, categoryId)}`,
            {method: 'get'},
        );
    };
};

export default ClientCategories;
