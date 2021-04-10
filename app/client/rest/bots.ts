// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@mm-redux/utils/helpers';

import type {Bot} from '@mm-redux/types/bots';

export interface ClientBotsMix {
    getBot: (botUserId: string) => Promise<Bot>;
    getBots: (page?: number, perPage?: number) => Promise<Bot[]>;
    getBotsIncludeDeleted: (page?: number, perPage?: number) => Promise<Bot[]>;
}

const PER_PAGE_DEFAULT = 60;

const ClientBots = (superclass: any) => class extends superclass {
    getBot = async (botUserId: string) => {
        return this.doFetch(
            `${this.getBotRoute(botUserId)}`,
            {method: 'get'},
        );
    }

    getBots = async (page = 0, perPage = PER_PAGE_DEFAULT) => {
        return this.doFetch(
            `${this.getBotsRoute()}${buildQueryString({page, per_page: perPage})}`,
            {method: 'get'},
        );
    }

    getBotsIncludeDeleted = async (page = 0, perPage = PER_PAGE_DEFAULT) => {
        return this.doFetch(
            `${this.getBotsRoute()}${buildQueryString({include_deleted: true, page, per_page: perPage})}`,
            {method: 'get'},
        );
    }
};

export default ClientBots;
