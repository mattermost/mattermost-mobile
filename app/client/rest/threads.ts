// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString, isMinimumServerVersion} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';

export interface ClientThreadsMix {
    getThreads: (
        userId: string, teamId: string,
        before?: string, after?: string, pageSize?: number,
        deleted?: boolean, unread?: boolean, since?: number, totalsOnly?: boolean, serverVersion?: string,
        excludeDirect?: boolean, groupLabel?: RequestGroupLabel,
    ) => Promise<GetUserThreadsResponse>;
    getThread: (userId: string, teamId: string, threadId: string, extended?: boolean) => Promise<any>;
    markThreadAsRead: (userId: string, teamId: string, threadId: string, timestamp: number) => Promise<any>;
    markThreadAsUnread: (userId: string, teamId: string, threadId: string, postId: string) => Promise<any>;
    updateTeamThreadsAsRead: (userId: string, teamId: string) => Promise<any>;
    updateThreadFollow: (userId: string, teamId: string, threadId: string, state: boolean) => Promise<any>;
}

const ClientThreads = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getThreads = async (
        userId: string, teamId: string,
        before = '', after = '', pageSize = PER_PAGE_DEFAULT,
        deleted = false, unread = false, since = 0, totalsOnly = false, serverVersion = '',
        excludeDirect = false, groupLabel?: RequestGroupLabel) => {
        const queryStringObj: Record<string, any> = {
            extended: 'true',
            before,
            after,
            deleted,
            unread,
            since,
            totalsOnly,
            excludeDirect,
        };
        if (serverVersion && isMinimumServerVersion(serverVersion, 6, 0)) {
            queryStringObj.per_page = pageSize;
        } else {
            queryStringObj.pageSize = pageSize;
        }
        return this.doFetch(
            `${this.getThreadsRoute(userId, teamId)}${buildQueryString(queryStringObj)}`,
            {method: 'get', groupLabel},
        );
    };

    getThread = async (userId: string, teamId: string, threadId: string, extended = true) => {
        return this.doFetch(
            `${this.getThreadRoute(userId, teamId, threadId)}${buildQueryString({extended})}`,
            {method: 'get'},
        );
    };

    markThreadAsRead = (userId: string, teamId: string, threadId: string, timestamp: number) => {
        const url = `${this.getThreadRoute(userId, teamId, threadId)}/read/${timestamp}`;
        return this.doFetch(
            url,
            {method: 'put', body: {}},
        );
    };

    markThreadAsUnread = (userId: string, teamId: string, threadId: string, postId: string) => {
        const url = `${this.getThreadRoute(userId, teamId, threadId)}/set_unread/${postId}`;
        return this.doFetch(
            url,
            {method: 'post'},
        );
    };

    updateTeamThreadsAsRead = (userId: string, teamId: string) => {
        const url = `${this.getThreadsRoute(userId, teamId)}/read`;
        return this.doFetch(
            url,
            {method: 'put', body: {}},
        );
    };

    updateThreadFollow = (userId: string, teamId: string, threadId: string, state: boolean) => {
        const url = this.getThreadRoute(userId, teamId, threadId) + '/following';
        return this.doFetch(
            url,
            {method: state ? 'put' : 'delete', body: {}},
        );
    };
};

export default ClientThreads;
