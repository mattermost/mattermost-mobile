// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

export interface ClientAppsMix {
    executeAppCall: <Res = unknown>(call: AppCallRequest, trackAsSubmit: boolean) => Promise<AppCallResponse<Res>>;
    getAppsBindings: (userID: string, channelID: string, teamID: string) => Promise<AppBinding[]>;
}

const ClientApps = (superclass: any) => class extends superclass {
    executeAppCall = async <Res = unknown>(call: AppCallRequest, trackAsSubmit: boolean): Promise<AppCallResponse<Res>> => {
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
            {method: 'post', body: callCopy},
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
