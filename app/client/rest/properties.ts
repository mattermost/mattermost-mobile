// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ClientBase from './base';

export interface ClientPropertiesMix {
    getPropertyValues: <T>(groupName: string, objectType: string, targetId: string, groupLabel?: RequestGroupLabel) => Promise<Array<PropertyValue<T>>>;
    getPropertyFields: (groupName: string, objectType: string, targetType: string, targetId?: string, groupLabel?: RequestGroupLabel) => Promise<PropertyField[]>;
    searchPropertyFields: (groupName: string, options: PropertyFieldSearchOpts, groupLabel?: RequestGroupLabel) => Promise<PropertyField[]>;
    getSystemPropertyValues: <T>(groupName: string, groupLabel?: RequestGroupLabel) => Promise<Array<PropertyValue<T>>>;
}

const ClientProperties = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getPropertyValues = async <T>(groupName: string, objectType: string, targetId: string, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/${objectType}/values/${targetId}`;
        return this.doFetch(
            url,
            {method: 'get', groupLabel},
        ) as unknown as Promise<Array<PropertyValue<T>>>;
    };

    getPropertyFields = async (groupName: string, objectType: string, targetType: string, targetId?: string, groupLabel?: RequestGroupLabel) => {
        let url = `${this.urlVersion}/properties/groups/${groupName}/${objectType}/fields?target_type=${targetType}`;
        if (targetId !== undefined) {
            url += `&target_id=${encodeURIComponent(targetId)}`;
        }
        return this.doFetch(
            url,
            {method: 'get', groupLabel},
        ) as unknown as Promise<PropertyField[]>;
    };

    searchPropertyFields = async (groupName: string, options: PropertyFieldSearchOpts, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/fields/search`;
        return this.doFetch(
            url,
            {method: 'post', body: options, groupLabel},
        ) as unknown as Promise<PropertyField[]>;
    };

    getSystemPropertyValues = async <T>(groupName: string, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/system/values`;
        return this.doFetch(
            url,
            {method: 'get', groupLabel},
        ) as unknown as Promise<Array<PropertyValue<T>>>;
    };
};

export default ClientProperties;
