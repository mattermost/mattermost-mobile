// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';

import type ChannelModel from '@typings/database/models/servers/channel';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupsChannelModel from '@typings/database/models/servers/groups_channel';
import type GroupsTeamModel from '@typings/database/models/servers/groups_team';
import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
import type PostModel from '@typings/database/models/servers/post';
import type TeamModel from '@typings/database/models/servers/team';

export const queryGroupsAssociatedToChannelForReference = async (channel: ChannelModel) => {
    const groupChannels = await channel.groupsChannel.fetch() as GroupsChannelModel[];
    const groupChannelPromises = groupChannels.map((g) => g.group.fetch());
    const groups = await Promise.all(groupChannelPromises) as GroupModel[];
    return groups.filter((g) => g.deleteAt === 0);
};

export const queryGroupsAssociatedToTeamForReference = async (team: TeamModel) => {
    const groupTeams = await team.groupsTeam.fetch() as GroupsTeamModel[];
    const teamGroupPromises = groupTeams.map((g) => g.group.fetch());
    const groups = await Promise.all(teamGroupPromises) as GroupModel[];
    return groups.filter((g) => g.deleteAt === 0);
};

export const queryGroupForPosts = async (post: PostModel) => {
    try {
        if (post.id === post.pendingPostId) {
            return null;
        }

        const channel = await post.channel.fetch() as ChannelModel;
        const team = await channel?.team.fetch() as TeamModel | undefined;
        let groupsForReference: GroupModel[] | null = null;

        if (team?.isGroupConstrained && channel.isGroupConstrained) {
            const groupsFromChannel = await queryGroupsAssociatedToChannelForReference(channel);
            const groupsFromTeam = await queryGroupsAssociatedToTeamForReference(team);
            groupsForReference = groupsFromChannel.concat(groupsFromTeam.filter((item) => groupsFromChannel.indexOf(item) < 0));
        } else if (team?.isGroupConstrained) {
            groupsForReference = await queryGroupsAssociatedToTeamForReference(team);
        } else if (channel.isGroupConstrained) {
            groupsForReference = await queryGroupsAssociatedToChannelForReference(channel);
        } else {
            const myGroups = await post.collections.get(MM_TABLES.SERVER.GROUP_MEMBERSHIP).query().fetch() as GroupMembershipModel[];
            const myGroupsPromises = myGroups.map((g) => g.group.fetch());
            groupsForReference = await Promise.all(myGroupsPromises) as GroupModel[];
        }

        return groupsForReference;
    } catch {
        return null;
    }
};
