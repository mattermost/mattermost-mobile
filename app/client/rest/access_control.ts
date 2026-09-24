// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {RENDER_PERMISSION_RESOURCE_CHANNEL} from '@constants/access_control';

import type ClientBase from './base';

export interface ClientAccessControlMix {
    searchChannelActionDecisions: (channelId: string, groupLabel?: RequestGroupLabel) => Promise<ActionSearchResponse>;
}

const ClientAccessControl = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    /**
     * Asks which actions the current user may perform in a channel. No action list is sent
     * (discovery mode): the server rejects the whole request when one listed action is unknown to it,
     * so a newer client asking an older server for a newer action would lose every decision.
     */
    searchChannelActionDecisions = async (channelId: string, groupLabel?: RequestGroupLabel) => {
        const body: ActionSearchRequest = {resource: {type: RENDER_PERMISSION_RESOURCE_CHANNEL, id: channelId}};
        return this.doFetch(`${this.urlVersion}/access_control/decisions/actions/search`, {method: 'post', body, groupLabel});
    };
};

export default ClientAccessControl;
