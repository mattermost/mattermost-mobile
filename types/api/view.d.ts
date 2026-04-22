// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ViewType = 'kanban';

type View = {
    id: string;
    channel_id: string;
    type: ViewType;
    creator_id: string;
    title: string;
    description?: string;
    sort_order: number;
    props: Record<string, unknown>;
    create_at: number;
    update_at: number;
    delete_at: number;
};

type ViewPatch = Partial<Pick<View, 'title' | 'description' | 'props' | 'sort_order'>>;
