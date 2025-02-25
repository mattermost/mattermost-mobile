// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientCustomAttributesMix {
    getCustomProfileAttributeFields: () => Promise<CustomProfileField[]>;
    getCustomProfileAttributeValues: (userID: string) => Promise<CustomProfileAttributeSimple>;
    updateCustomProfileAttributeValues: (values: CustomProfileAttributeSimple) => Promise<string>;
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
            `${this.getUserCustomProfileAttributesRoute(userID)}`,
            {method: 'get'},
        );
    };
    updateCustomProfileAttributeValues = async (values: CustomProfileAttributeSimple) => {
        return this.doFetch(
            `${this.getCustomProfileAttributesRoute()}/values`,
            {
                method: 'patch',
                body: values,
            },
        );
    };
};

export default ClientCustomAttributes;
