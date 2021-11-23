// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type CategoryType = 'channels' | 'custom' |'direct_messages' |'favorites';

type Category = {
    id: string;
    user_id: string;
    team_id: string;
    display_name: string;
    type: CategoryType;
    collapsed: boolean;
    channel_ids: string[];
}

type CategoriesOrder = string[];

type Categories = {categories: Category[]; order: CategoriesOrder}
