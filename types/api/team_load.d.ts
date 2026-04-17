// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// TeamLoadResponse — mirrors server/public/model/team_load.go
// Used by GET /api/v4/users/me/teams/{team_id}/load

type TeamLoadResponse = {
    channels: ChannelLoadItem[];
    channel_members: ChannelMemberLoadList;
    sidebar_categories?: CategoriesWithOrder;
    sidebar_version: number;
    roles?: RoleLoadItem[];
    timestamp: number;
};
