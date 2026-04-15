// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type PropertyValue<T = unknown> = {
    id: string;
    target_id: string;
    target_type: string;
    group_id: string;
    field_id: string;
    value: T;
    create_at: number;
    update_at: number;
    delete_at: number;
};

type PropertyField = {
    id: string;
    group_id: string;
    name: string;
    type: string;
    target_type: string;
    create_at: number;
    update_at: number;
    delete_at: number;
};

type PropertyValuesUpdatedData = {
    object_type?: string;
    target_id?: string;
    field_id?: string;
    values: string;
};
