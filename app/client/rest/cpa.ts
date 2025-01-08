// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientCustomAttributesMix {
    getCustomProfileAttributeFields: () => Promise<CustomProfileField[]>;
}

const ClientCustomAttributes = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getCustomProfileAttributeFields = async () => {
        return this.doFetch(
            `${this.getCPARoute()}/fields`,
            {method: 'get'},
        );
    };
};

export default ClientCustomAttributes;
