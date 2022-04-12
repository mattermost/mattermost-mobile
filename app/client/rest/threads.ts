// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString, isMinimumServerVersion} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

export interface ClientThreadsMix {
    getThreads: (userId: string, teamId: string, before?: string, after?: string, pageSize?: number, deleted?: boolean, unread?: boolean, since?: number, totalsOnly?: boolean, serverVersion?: string) => Promise<GetUserThreadsResponse>;
    getThread: (userId: string, teamId: string, threadId: string, extended?: boolean) => Promise<any>;
    updateTeamThreadsAsRead: (userId: string, teamId: string) => Promise<any>;
    updateThreadRead: (userId: string, teamId: string, threadId: string, timestamp: number) => Promise<any>;
    updateThreadFollow: (userId: string, teamId: string, threadId: string, state: boolean) => Promise<any>;
}

const ClientThreads = (superclass: any) => class extends superclass {
    getThreads = async (userId: string, teamId: string, before = '', after = '', pageSize = PER_PAGE_DEFAULT, deleted = false, unread = false, since = 0, totalsOnly = false, serverVersion = '') => {
        const queryStringObj: Record<string, any> = {
            extended: 'true',
            before,
            after,
            deleted,
            unread,
            since,
            totalsOnly,
        };
        if (serverVersion && isMinimumServerVersion(serverVersion, 6, 0)) {
            queryStringObj.per_page = pageSize;
        } else {
            queryStringObj.pageSize = pageSize;
        }
        return this.doFetch(
            `${this.getThreadsRoute(userId, teamId)}${buildQueryString(queryStringObj)}`,
            {method: 'get'},
        );
    };

    getThread = async (userId: string, teamId: string, threadId: string, extended = true) => {
        return this.doFetch(
            `${this.getThreadRoute(userId, teamId, threadId)}${buildQueryString({extended})}`,
            {method: 'get'},
        );
    };

    updateTeamThreadsAsRead = (userId: string, teamId: string) => {
        const url = `${this.getThreadsRoute(userId, teamId)}/read`;
        return this.doFetch(
            url,
            {method: 'put'},
        );
    };

    updateThreadRead = (userId: string, teamId: string, threadId: string, timestamp: number) => {
        const url = `${this.getThreadRoute(userId, teamId, threadId)}/read/${timestamp}`;
        return this.doFetch(
            url,
            {method: 'put'},
        );
    };

    updateThreadFollow = (userId: string, teamId: string, threadId: string, state: boolean) => {
        const url = this.getThreadRoute(userId, teamId, threadId) + '/following';
        return this.doFetch(
            url,
            {method: state ? 'put' : 'delete'},
        );
    };
};

export default ClientThreads;
