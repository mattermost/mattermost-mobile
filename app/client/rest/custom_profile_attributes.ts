// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientCustomAttributesMix {
    getCustomProfileAttributeFields: () => Promise<CustomProfileField[]>;
    getCustomProfileAttributeValues: (userID: string) => Promise<CustomProfileAttributeSimple>;
}

const ClientCustomAttributes = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getCustomProfileAttributeFields = async () => {
        return this.doFetch(
            `${this.getCustomProfileAttributesRoute()}/fields`,
            {method: 'get'},
        );
    };

    getCustomProfileAttributeValues = async (userID: string) => {
        return this.doFetch(
            `${this.getUserRoute(userID)}/custom_profile_attributes`,
            {method: 'get'},
        );
    };
};

export default ClientCustomAttributes;
