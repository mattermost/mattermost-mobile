// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

import type ClientBase from './base';

export interface ClientNPSMix {
    npsGiveFeedbackAction: () => Promise<Post>;
}

const ClientNPS = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    npsGiveFeedbackAction = async () => {
        return this.doFetch(
            `${this.getPluginRoute(General.NPS_PLUGIN_ID)}/api/v1/give_feedback`,
            {method: 'post'},
        );
    };
};

export default ClientNPS;
