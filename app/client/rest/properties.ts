// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {safeArrayCast} from '@utils/helpers';

import type ClientBase from './base';

export interface ClientPropertiesMix {
    getPropertyValues: <T>(groupName: string, objectType: string, targetId: string, groupLabel?: RequestGroupLabel) => Promise<Array<PropertyValue<T>>>;
    getPropertyFields: (groupName: string, objectType: string, targetType: string, targetId?: string, groupLabel?: RequestGroupLabel) => Promise<PropertyField[]>;
    searchPropertyFields: (groupName: string, options: PropertyFieldSearchOpts, groupLabel?: RequestGroupLabel) => Promise<PropertyField[]>;
    getSystemPropertyValues: <T>(groupName: string, groupLabel?: RequestGroupLabel) => Promise<Array<PropertyValue<T>>>;
    patchPropertyValues: <T>(groupName: string, objectType: string, targetId: string, items: Array<PropertyValuePatchItem<T>>, groupLabel?: RequestGroupLabel) => Promise<Array<PropertyValue<T>>>;
}

const ClientProperties = <TBase extends Constructor<ClientBase>>(superclass: TBase) => class extends superclass {
    getPropertyValues = async <T>(groupName: string, objectType: string, targetId: string, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/${objectType}/values/${targetId}`;
        return safeArrayCast<PropertyValue<T>>(await this.doFetch(url, {method: 'get', groupLabel}));
    };

    getPropertyFields = async (groupName: string, objectType: string, targetType: string, targetId?: string, groupLabel?: RequestGroupLabel) => {
        let url = `${this.urlVersion}/properties/groups/${groupName}/${objectType}/fields?target_type=${targetType}`;
        if (targetId !== undefined) {
            url += `&target_id=${encodeURIComponent(targetId)}`;
        }
        return safeArrayCast<PropertyField>(await this.doFetch(url, {method: 'get', groupLabel}));
    };

    searchPropertyFields = async (groupName: string, options: PropertyFieldSearchOpts, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/fields/search`;
        return safeArrayCast<PropertyField>(await this.doFetch(url, {method: 'post', body: options, groupLabel}));
    };

    getSystemPropertyValues = async <T>(groupName: string, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/system/values`;
        return safeArrayCast<PropertyValue<T>>(await this.doFetch(url, {method: 'get', groupLabel}));
    };

    // The route takes a bare array, not an object, and upserts every item. A null
    // value clears the field: the response carries a null-valued row rather than
    // signalling a delete.
    //
    // The server caps the batch at MAX_PROPERTY_VALUE_PATCH_ITEMS and rejects a
    // larger one outright rather than truncating, so a caller that ever batches
    // has to chunk. Every caller today sends a single item.
    patchPropertyValues = async <T>(groupName: string, objectType: string, targetId: string, items: Array<PropertyValuePatchItem<T>>, groupLabel?: RequestGroupLabel) => {
        const url = `${this.urlVersion}/properties/groups/${groupName}/${objectType}/values/${targetId}`;
        return safeArrayCast<PropertyValue<T>>(await this.doFetch(url, {method: 'patch', body: items, groupLabel}));
    };
};

export default ClientProperties;
