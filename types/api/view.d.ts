// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type ViewType = 'kanban';

type KanbanColumn = {
    id: string;
    option_id: string;
    title: string;
    sort_order: number;
};

type KanbanGroupBy = {
    field_id: string;
    columns: KanbanColumn[];
};

type KanbanProps = {
    group_by?: KanbanGroupBy;
};

type View = {
    id: string;
    channel_id: string;
    type: ViewType;
    creator_id: string;
    title: string;
    description?: string | null;
    sort_order: number;
    props?: KanbanProps | null;
    create_at: number;
    update_at: number;
    delete_at: number;
};

type ViewPatch = Partial<Pick<View, 'title' | 'description' | 'props' | 'sort_order'>>;
