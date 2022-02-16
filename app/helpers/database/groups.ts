// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
export {};

// groups: MM-41882 import {MM_TABLES} from '@constants/database';
// groups: MM-41882
// groups: MM-41882 import type ChannelModel from '@typings/database/models/servers/channel';
// groups: MM-41882 import type GroupModel from '@typings/database/models/servers/group';
// groups: MM-41882 import type GroupMembershipModel from '@typings/database/models/servers/group_membership';
// groups: MM-41882 import type GroupsChannelModel from '@typings/database/models/servers/groups_channel';
// groups: MM-41882 import type GroupsTeamModel from '@typings/database/models/servers/groups_team';
// groups: MM-41882 import type PostModel from '@typings/database/models/servers/post';
// groups: MM-41882 import type TeamModel from '@typings/database/models/servers/team';
// groups: MM-41882
// groups: MM-41882 export const queryGroupsAssociatedToChannelForReference = async (channel: ChannelModel) => {
// groups: MM-41882     const groupChannels = await channel.groupsChannel.fetch() as GroupsChannelModel[];
// groups: MM-41882     const groupChannelPromises = groupChannels.map((g) => g.group.fetch());
// groups: MM-41882     const groups = await Promise.all(groupChannelPromises) as GroupModel[];
// groups: MM-41882     return groups.filter((g) => g.deleteAt === 0);
// groups: MM-41882 };
// groups: MM-41882
// groups: MM-41882 export const queryGroupsAssociatedToTeamForReference = async (team: TeamModel) => {
// groups: MM-41882     const groupTeams = await team.groupsTeam.fetch() as GroupsTeamModel[];
// groups: MM-41882     const teamGroupPromises = groupTeams.map((g) => g.group.fetch());
// groups: MM-41882     const groups = await Promise.all(teamGroupPromises) as GroupModel[];
// groups: MM-41882     return groups.filter((g) => g.deleteAt === 0);
// groups: MM-41882 };
// groups: MM-41882
// groups: MM-41882 export const queryGroupForPosts = async (post: PostModel) => {
// groups: MM-41882     try {
// groups: MM-41882         if (post.id === post.pendingPostId) {
// groups: MM-41882             return null;
// groups: MM-41882         }
// groups: MM-41882
// groups: MM-41882         const channel = await post.channel.fetch() as ChannelModel;
// groups: MM-41882         const team = await channel?.team.fetch() as TeamModel | undefined;
// groups: MM-41882         let groupsForReference: GroupModel[] | null = null;
// groups: MM-41882
// groups: MM-41882         if (team?.isGroupConstrained && channel.isGroupConstrained) {
// groups: MM-41882             const groupsFromChannel = await queryGroupsAssociatedToChannelForReference(channel);
// groups: MM-41882             const groupsFromTeam = await queryGroupsAssociatedToTeamForReference(team);
// groups: MM-41882             groupsForReference = groupsFromChannel.concat(groupsFromTeam.filter((item) => groupsFromChannel.indexOf(item) < 0));
// groups: MM-41882         } else if (team?.isGroupConstrained) {
// groups: MM-41882             groupsForReference = await queryGroupsAssociatedToTeamForReference(team);
// groups: MM-41882         } else if (channel.isGroupConstrained) {
// groups: MM-41882             groupsForReference = await queryGroupsAssociatedToChannelForReference(channel);
// groups: MM-41882         } else {
// groups: MM-41882             const myGroups = await post.collections.get(MM_TABLES.SERVER.GROUP_MEMBERSHIP).query().fetch() as GroupMembershipModel[];
// groups: MM-41882             const myGroupsPromises = myGroups.map((g) => g.group.fetch());
// groups: MM-41882             groupsForReference = await Promise.all(myGroupsPromises) as GroupModel[];
// groups: MM-41882         }
// groups: MM-41882
// groups: MM-41882         return groupsForReference;
// groups: MM-41882     } catch {
// groups: MM-41882         return null;
// groups: MM-41882     }
// groups: MM-41882 };
