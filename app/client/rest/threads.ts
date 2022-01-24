// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString, isMinimumServerVersion} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientThreadsMix {
    getThreads: (serverVersion: string, userId: string, teamId: string, before?: string, after?: string, pageSize?: number, deleted?: boolean, unread?: boolean, since?: number) => Promise<any>;
}

const ClientThreads = (superclass: any) => class extends superclass {
    getThreads = async (serverVersion: string, userId: string, teamId: string, before = '', after = '', pageSize = PER_PAGE_DEFAULT, deleted = false, unread = false, since = 0) => {
        const queryStringObj: Record<string, any> = {
            extended: 'true',
            before,
            after,
            deleted,
            unread,
            since,
        };
        if (isMinimumServerVersion(serverVersion, 6, 0)) {
            queryStringObj.per_page = pageSize;
        } else {
            queryStringObj.pageSize = pageSize;
        }
        return this.doFetch(
            `${this.getThreadsRoute(userId, teamId)}${buildQueryString(queryStringObj)}`,
            {method: 'get'},
        );
    };
};

export default ClientThreads;
