// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import type ClientBase from './base';

export interface ClientScheduledPostMix {
    createScheduledPost(schedulePost: ScheduledPost, connectionId?: string): Promise<ScheduledPost>;
    updateScheduledPost(scheduledPost: ScheduledPost, connectionId?: string): Promise<ScheduledPost>;
    getScheduledPostsForTeam(teamId: string, includeDirectChannels: boolean, groupLabel?: RequestGroupLabel): Promise<FetchScheduledPostsResponse>;
    deleteScheduledPost(scheduledPostId: string, connectionId?: string): Promise<ScheduledPost>;
}

const ClientScheduledPost = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    createScheduledPost = (schedulePost: ScheduledPost, connectionId?: string) => {
        const headers: Record<string, string> = {};
        if (connectionId) {
            headers['Connection-Id'] = connectionId;
        }
        return this.doFetch(
            this.getScheduledPostRoute(),
            {
                method: 'post',
                body: schedulePost,
                headers,
            },
        );
    };

    updateScheduledPost = (scheduledPost: ScheduledPost, connectionId = '') => {
        const scheduledPostId = scheduledPost.id;
        const headers: Record<string, string> = {};
        if (connectionId) {
            headers['Connection-Id'] = connectionId;
        }
        return this.doFetch(
            `${this.getScheduledPostRoute()}/${scheduledPostId}`,
            {
                method: 'put',
                body: scheduledPost,
                headers,
            },
        );
    };

    getScheduledPostsForTeam(teamId: string, includeDirectChannels = false, groupLabel?: RequestGroupLabel) {
        return this.doFetch(
            `${this.getTeamAndDirectChannelScheduledPostsRoute()}/team/${teamId}${buildQueryString({includeDirectChannels})}`,
            {method: 'get', groupLabel},
        );
    }

    deleteScheduledPost(scheduledPostId: string, connectionId = '') {
        const headers: Record<string, string> = {};
        if (connectionId) {
            headers['Connection-Id'] = connectionId;
        }
        return this.doFetch(
            `${this.getScheduledPostRoute()}/${scheduledPostId}`,
            {
                method: 'delete',
                headers,
            },
        );
    }
};

export default ClientScheduledPost;
