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
            if (t.id === general.currentTeamId && user.id === general.currentUserId) {
                general.currentTeamId = null;
            }
        }
    });
}

export function createOrUpdateTeams(realm, data, teamMembersMap = null) {
    if (data.teams?.length) {
        const totalTeams = data.teams.length;
        for (let i = 0; i < totalTeams; i++) {
            const teamData = data.teams[i];
            const realmTeam = realm.objectForPrimaryKey('Team', teamData.id);
            const teamMembers = teamMembersMap?.get(teamData.id) || [];

            if (realmTeam) {
                const currentMembers = realmTeam.members.map((m) => m);
                teamMembers.forEach((member) => {
                    const index = currentMembers.findIndex((c) => c.id === `${teamData.id}-${member.user.id}`);
                    if (index === -1) {
                        realmTeam.members.push(member);
                    } else {
                        realm.create('TeamMember', member, true);
                    }
                });
            } else {
                teamData.members = teamMembers;
                realm.create('Team', teamDataToRealm(teamData), true);
            }
        }
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

    case TeamTypes.SELECT_TEAM_AND_CLEAR_CHANNEL: {
        const {data} = action;
        const generalRealm = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        generalRealm.currentTeamId = data;
        generalRealm.currentChannelId = null;
        break;
    }

    case TeamTypes.RECEIVED_TEAMS_LIST: {
        const data = action.data || action.payload;

        createOrUpdateTeams(realm, data);
        break;
    }

    default:
        break;
    }
}

export default combineWriters([
    myTeamsWriter,
]);
