// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General} from '@constants';

import type ClientBase from './base';

export interface ClientAliasesMix {
    getAliases: () => Promise<Record<string, string>>;
}

const ClientAliases = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getAliases = async () => {
        return this.doFetch(
            `${this.getPluginRoute(General.ALIASES_PLUGIN_ID)}/api/v1/aliases`,
            {method: 'get'},
        );
    };
};

export default ClientAliases;
