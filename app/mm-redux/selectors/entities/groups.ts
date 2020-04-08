// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {NameMappedObjects} from '@mm-redux/types/utilities';

// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import * as reselect from 'reselect';
import {GlobalState} from '@mm-redux/types/store';
import {Group} from '@mm-redux/types/groups';
import {filterGroupsMatchingTerm} from '@mm-redux/utils/group_utils';
import {getCurrentUserLocale} from '@mm-redux/selectors/entities/i18n';
import {getChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getUsers} from '@mm-redux/selectors/entities/common';
import {haveIChannelPermission} from '@mm-redux/selectors/entities/roles';
import {getTeam} from '@mm-redux/selectors/entities/teams';
import {Permissions} from '@mm-redux/constants';

const emptyList: any[] = [];
const emptySyncables = {
    teams: [],
    channels: [],
};

export function getAllGroups(state: GlobalState) {
    return state.entities.groups?.groups || [];
}

export function getGroup(state: GlobalState, id: string) {
    return getAllGroups(state)[id];
}

export function getGroupMemberCount(state: GlobalState, id: string) {
    const memberData = state.entities.groups.members;
    const groupMemberData = memberData[id];
    if (!groupMemberData) {
        return 0;
    }
    return memberData[id].totalMemberCount;
}

function getGroupSyncables(state: GlobalState, id: string) {
    return state.entities.groups.syncables[id] || emptySyncables;
}

export function getGroupTeams(state: GlobalState, id: string) {
    return getGroupSyncables(state, id).teams;
}

export function getGroupChannels(state: GlobalState, id: string) {
    return getGroupSyncables(state, id).channels;
}

export function getGroupMembers(state: GlobalState, id: string) {
    const groupMemberData = state.entities.groups.members[id];
    if (!groupMemberData) {
        return emptyList;
    }
    return groupMemberData.members;
}

export function searchAssociatedGroupsForReferenceLocal(state: GlobalState, term: string, teamId: string, channelId: string): Array<Group> {
    const groups = getAssociatedGroupsForReference(state, teamId, channelId);
    if (!groups || groups.length === 0) {
        return emptyList;
    }
    const filteredGroups = filterGroupsMatchingTerm(groups, term);
    return filteredGroups.sort((groupA: Group, groupB: Group) => groupA.name.localeCompare(groupB.name, locale));
}

export function getAssociatedGroupsForReference(state: GlobalState, teamId: string, channelId: string): Array<Group> {
    const team = getTeam(state, teamId);
    const channel = getChannel(state, channelId);
    const locale = getCurrentUserLocale(state);

    if (!haveIChannelPermission(state, {
        permission: Permissions.USE_GROUP_MENTIONS,
        channel: channelId,
        team: teamId,
        default: true,
    })) {
        return emptyList;
    }

    let groupsForReference = [];
    if (team && team.group_constrained && channel && channel.group_constrained) {
        const groupsFromChannel = getGroupsAssociatedToChannelForReference(state, channelId);
        const groupsFromTeam = getGroupsAssociatedToTeamForReference(state, teamId);
        groupsForReference = groupsFromChannel.concat(groupsFromTeam.filter((item) => groupsFromChannel.indexOf(item) < 0));
    } else if (team && team.group_constrained) {
        groupsForReference = getGroupsAssociatedToTeamForReference(state, teamId);
    } else if (channel && channel.group_constrained) {
        groupsForReference = getGroupsAssociatedToChannelForReference(state, channelId);
    } else {
        groupsForReference = getAllAssociatedGroupsForReference(state);
    }
    return groupsForReference.sort((groupA: Group, groupB: Group) => groupA.name.localeCompare(groupB.name, locale));
}

const teamGroupIDs = (state: GlobalState, teamID: string) => state.entities.teams.groupsAssociatedToTeam[teamID]?.ids || [];

const channelGroupIDs = (state: GlobalState, channelID: string) => state.entities.channels.groupsAssociatedToChannel[channelID]?.ids || [];

const getTeamGroupIDSet = reselect.createSelector(
    teamGroupIDs,
    (teamIDs) => new Set(teamIDs),
);

const getChannelGroupIDSet = reselect.createSelector(
    channelGroupIDs,
    (channelIDs) => new Set(channelIDs),
);

export const getGroupsNotAssociatedToTeam = reselect.createSelector(
    getAllGroups,
    (state: GlobalState, teamID: string) => getTeamGroupIDSet(state, teamID),
    (allGroups, teamGroupIDSet) => {
        return Object.values(allGroups).filter((group) => !teamGroupIDSet.has(group.id));
    },
);

export const getGroupsAssociatedToTeam = reselect.createSelector(
    getAllGroups,
    (state: GlobalState, teamID: string) => getTeamGroupIDSet(state, teamID),
    (allGroups, teamGroupIDSet) => {
        return Object.values(allGroups).filter((group) => teamGroupIDSet.has(group.id));
    },
);

export const getGroupsNotAssociatedToChannel = reselect.createSelector(
    getAllGroups,
    (state: GlobalState, channelID: string) => getChannelGroupIDSet(state, channelID),
    (allGroups, channelGroupIDSet) => {
        return Object.values(allGroups).filter((group) => !channelGroupIDSet.has(group.id));
    },
);

export const getGroupsAssociatedToChannel = reselect.createSelector(
    getAllGroups,
    (state: GlobalState, channelID: string) => getChannelGroupIDSet(state, channelID),
    (allGroups, channelGroupIDSet) => {
        return Object.values(allGroups).filter((group) => channelGroupIDSet.has(group.id));
    },
);

export const getGroupsAssociatedToTeamForReference = reselect.createSelector(
    getAllGroups,
    (state: GlobalState, teamID: string) => getTeamGroupIDSet(state, teamID),
    (allGroups, teamGroupIDSet) => {
        return Object.values(allGroups).filter((group) => teamGroupIDSet.has(group.id) && group.allow_reference && group.delete_at === 0);
    },
);

export const getGroupsAssociatedToChannelForReference = reselect.createSelector(
    getAllGroups,
    (state: GlobalState, channelID: string) => getChannelGroupIDSet(state, channelID),
    (allGroups, channelGroupIDSet) => {
        return Object.values(allGroups).filter((group) => channelGroupIDSet.has(group.id) && group.allow_reference && group.delete_at === 0);
    },
);

export const getAllAssociatedGroupsForReference = reselect.createSelector(
    getAllGroups,
    (allGroups) => {
        return Object.values(allGroups).filter((group) => group.allow_reference && group.delete_at === 0);
    },
);
