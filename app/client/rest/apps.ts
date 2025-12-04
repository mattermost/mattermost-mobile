// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {buildQueryString} from '@utils/helpers';

import type ClientBase from './base';

export interface ClientAppsMix {
    executeAppCall: <Res = unknown>(call: AppCallRequest, trackAsSubmit: boolean) => Promise<AppCallResponse<Res>>;
    getAppsBindings: (userID: string, channelID: string, teamID: string, groupLabel?: RequestGroupLabel) => Promise<AppBinding[]>;
}

const ClientApps = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
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
            {method: 'post', body: callCopy},
        );
    };

    getAppsBindings = async (userID: string, channelID: string, teamID: string, groupLabel?: RequestGroupLabel) => {
        const params = {
            user_id: userID,
            channel_id: channelID,
            team_id: teamID,
            user_agent: 'mobile',
        };

        return this.doFetch(
            `${this.getAppsProxyRoute()}/api/v1/bindings${buildQueryString(params)}`,
            {method: 'get', groupLabel},
        );
    };
};

export default ClientApps;
