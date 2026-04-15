// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientPropertiesMix {
    getPropertyValues: <T>(groupName: string, objectType: string, targetId: string, groupLabel?: RequestGroupLabel) => Promise<Array<PropertyValue<T>>>;
    getPropertyFields: (groupName: string, objectType: string, targetType: string, groupLabel?: RequestGroupLabel) => Promise<PropertyField[]>;
}

const ClientProperties = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getPropertyValues = async <T>(groupName: string, objectType: string, targetId: string, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/${objectType}/values/${targetId}`;
        return this.doFetch(
            url,
            {method: 'get', groupLabel},
        ) as unknown as Promise<Array<PropertyValue<T>>>;
    };

    getPropertyFields = async (groupName: string, objectType: string, targetType: string, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/${objectType}/fields?target_type=${targetType}`;
        return this.doFetch(
            url,
            {method: 'get', groupLabel},
        ) as unknown as Promise<PropertyField[]>;
    };
};

export default ClientProperties;
