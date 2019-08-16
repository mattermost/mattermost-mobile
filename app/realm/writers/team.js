// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {General} from 'app/constants';
import {TeamTypes} from 'app/realm/action_types';
import {teamDataToRealm, teamMemberDataToRealm} from 'app/realm/utils/team';

export function mapTeamMembers(data, user) {
    const teamMembersMap = new Map();

    if (data.teams?.length && data.teamMembers?.length) {
        data.teamMembers.forEach((member) => {
            const members = teamMembersMap.get(member.team_id) || [];

            let unreads;
            if (data.teamUnreads?.length) {
                unreads = data.teamUnreads.find((u) => u.team_id === member.team_id);
            }

            if (unreads) {
                member.mention_count = unreads.mention_count;
                member.msg_count = unreads.msg_count;
            }

            members.push(teamMemberDataToRealm(user, member));
            teamMembersMap.set(member.team_id, members);
        });
    }

    return teamMembersMap;
}

export function removeTeamMemberships(realm, general, user, teamMembersMap) {
    const realmTeams = realm.objects('Team');
    realmTeams.forEach((t) => {
        const teamMembers = teamMembersMap.get(t.id);
        if (!teamMembers || teamMembers[0]?.deleteAt) {
            realm.delete(realm.objectForPrimaryKey('TeamMember', `${t.id}-${user.id}`));

            // If we are no longer in the team but is currently selected, we have to clear the selection
            // to let the application select the next default team
            if (t.id === general.currentTeamId) {
                general.currentTeamId = null;
            }
        }
    });
}

export function createOrUpdateTeams(realm, data, teamMembersMap) {
    if (data.teams?.length) {
        data.teams.forEach((teamData) => {
            teamData.members = teamMembersMap.get(teamData.id) || [];
            realm.create('Team', teamDataToRealm(teamData), true);
        });
    }
}

function myTeamsWriter(realm, action) {
    switch (action.type) {
    case TeamTypes.RECEIVED_MY_TEAMS: {
        const data = action.data || action.payload;
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const user = realm.objectForPrimaryKey('User', general?.currentUserId);

        if (user) {
            const teamMembersMap = mapTeamMembers(data, user);

            // Remove membership from teams
            removeTeamMemberships(realm, general, user, teamMembersMap);

            createOrUpdateTeams(realm, data, teamMembersMap);
        }

        break;
    }

    case TeamTypes.SELECT_TEAM: {
        const {data} = action;
        const generalRealm = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        generalRealm.currentTeamId = data;
        break;
    }

    default:
        break;
    }
}

export default combineWriters([
    myTeamsWriter,
]);
