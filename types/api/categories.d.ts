// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type CategorySorting = '' | 'alpha' | 'manual' | 'recent'
type CategoryType = 'channels' | 'direct_messages' | 'favorites' | 'custom'

type CategoryOrder = string[]
type CategoryChannelOrder = string[]

type CategoryChannel = {
    id?: string;
    user_id: string;
    category_id: string;
    channel_id: string;
    sort_order: number;
}

type Category = {
    id: string;
    user_id: string;
    team_id: string;
    display_name: string;
    sort_order: number;
    sorting: CategorySorting;
    type: CategoryType;
    muted: boolean;
    collapsed: boolean;
}

type CategoryWithChannels = Category & {
    channel_ids: CategoryChannelOrder;
}

type CategoriesWithOrder = {
    categories: CategoryWithChannels[];
    order: CategoryOrder;
}
