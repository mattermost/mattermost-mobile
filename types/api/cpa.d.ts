// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type CustomProfileField = {
    id: string;
    group_id: string;
    name: string;
    type: string;
    attrs?: unknown;
    target_id: string;
    target_type: string;
    create_at: number;
    update_at: number;
    delete_at: number;
};

type DisplayCustomAttribute = {
    id: string;
    name: string;
    value: string;
};
