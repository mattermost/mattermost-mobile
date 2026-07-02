// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PropertyFieldType =
    | 'text'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'user'
    | 'multiuser'
    | 'checkbox'
    | 'number'
    | 'url';

// Canonical server values are 'post' | 'channel' | 'user' (see managed_categories WS handler,
// REST property endpoints). 'card' is a mobile/boards-only domain alias — boards cards are
// backed by 'post' on the server, so API object_type is 'post'; keep 'card' only for
// mobile-local representations. 'system' and 'template' are used by the classification-markings
// fields (see @constants/classification).
type PropertyFieldObjectType = 'card' | 'post' | 'channel' | 'user' | 'system' | 'template';

type PropertyFieldTargetLevel = 'system' | 'team' | 'channel';

type PermissionLevel = 'none' | 'viewer' | 'editor' | 'admin';

type PropertyFieldOption = {
    id: string;
    name: string;
    color?: string;
    rank?: number;
};

type PropertyFieldAttrs = {
    sort_order?: number;
    options?: PropertyFieldOption[];
    [key: string]: unknown;
};

type PropertyField = {
    id: string;
    group_id: string;
    name: string;
    type: PropertyFieldType;
    attrs?: PropertyFieldAttrs;
    object_type: PropertyFieldObjectType;
    target_id: string;
    target_type: PropertyFieldTargetLevel;
    linked_field_id?: string;
    protected?: boolean;
    permission_field?: string;
    permission_values?: unknown;
    permission_options?: unknown;
    create_at: number;
    update_at: number;
    delete_at: number;
    created_by?: string;
    updated_by?: string;
};

type PropertyValue<T = unknown> = {
    id: string;
    field_id: string;
    target_id: string;
    target_type: string;
    group_id: string;
    value: T;
    create_at: number;
    update_at: number;
    delete_at: number;
    created_by?: string;
    updated_by?: string;
};

type PropertyValuePatch<T = unknown> = Partial<Pick<PropertyValue<T>, 'value'>>;

type PropertyValuesUpdatedData = {
    object_type?: string;
    target_id?: string;
    field_id?: string;
    values: string;
};
