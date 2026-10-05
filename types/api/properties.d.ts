// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PropertyFieldType =
    | 'text'
    | 'select'
    | 'multiselect'
    | 'rank'
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

// Mirrors model.PermissionLevel. An empty string means the server fills in the
// default for the field's object type, which for a channel field is 'member'
// (see defaultPermissionValuesForObjectType in the server's property hooks).
type PermissionLevel = 'none' | 'sysadmin' | 'admin' | 'member' | '';

// How a channel attribute's value may move once it is set, mirroring
// attrs.change_policy. The directional policies compare option ranks, so the
// server strips them from any field that is not rank-typed.
type PropertyChangePolicy = 'any' | 'raise_only' | 'lower_only' | 'never';

type PropertyFieldOption = {
    id: string;
    name: string;
    color?: string;
    rank?: number;
};

type PropertyFieldAction = 'display_banner_top' | 'display_banner_bottom' | 'display_label_header' | 'display_label_info';

type PropertyFieldAttrs = {
    sort_order?: number;
    options?: PropertyFieldOption[];

    // Where a channel attribute's value displays. Server-validated allow-list;
    // see @constants/channel_attributes. An empty array means an administrator
    // chose no locations, which is not the same as the key being absent.
    // Unknown values from a future server are retained via the index signature below.
    actions?: PropertyFieldAction[];

    // Channel-attribute configuration written by the System Console's Channels
    // resource row. `editable` predates `change_policy`; false reads as 'never'.
    required?: boolean;
    change_policy?: PropertyChangePolicy;
    editable?: boolean;

    // Admin-facing override for the field's CEL-safe machine name. Not copied
    // onto linked fields by the server, so channel fields usually lack it.
    display_name?: string;

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
    permission_field?: PermissionLevel;
    permission_values?: PermissionLevel;
    permission_options?: PermissionLevel;
    create_at: number;
    update_at: number;
    delete_at: number;
    created_by?: string;
    updated_by?: string;
};

type PropertyFieldSearchOpts = {
    object_types: PropertyFieldObjectType[];
    channel_id?: string;
    team_id?: string;
    target_type?: PropertyFieldTargetLevel;
    target_id?: string;
    since?: number;
    cursor_id?: string;
    cursor_create_at?: number;
    cursor_update_at?: number;
    per_page?: number;
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
