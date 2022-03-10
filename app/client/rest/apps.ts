// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@mm-redux/utils/helpers';

import type {AppBinding, AppCallRequest, AppCallResponse} from '@mm-redux/types/apps';

export interface ClientAppsMix {
    executeAppCall: (call: AppCallRequest, trackAsSubmit: boolean) => Promise<AppCallResponse>;
    getAppsBindings: (userID: string, channelID: string, teamID: string) => Promise<AppBinding[]>;
}

const ClientApps = (superclass: any) => class extends superclass {
    executeAppCall = async (call: AppCallRequest, trackAsSubmit: boolean) => {
        const callCopy = {
            ...call,
            context: {
                ...call.context,
                user_agent: 'mobile',
                track_as_submit: trackAsSubmit,
            },
        };

        return this.doFetch(
            `${this.getAppsProxyRoute()}/api/v1/call`,
            {method: 'post', body: JSON.stringify(callCopy)},
        );
    };

    getAppsBindings = async (userID: string, channelID: string, teamID: string) => {
        const params = {
            user_id: userID,
            channel_id: channelID,
            team_id: teamID,
            user_agent: 'mobile',
        };

        return this.doFetch(
            `${this.getAppsProxyRoute()}/api/v1/bindings${buildQueryString(params)}`,
            {method: 'get'},
        );
    };
};

export default ClientApps;
