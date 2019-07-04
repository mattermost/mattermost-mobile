// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {UserTypes} from 'app/action_types';
import {GENERAL_SCHEMA_ID} from 'app/models/general';
import ephemeralStore from 'app/store/ephemeral_store';
import {userDataToRealm} from 'app/utils/realm/user';
import {teamDataToRealm, teamMemberDataToRealm} from 'app/utils/realm/team';

function currentUser(realm, action) {
    switch (action.type) {
    case UserTypes.RECEIVED_ME: {
        const data = action.data || action.payload;
        const user = userDataToRealm(data.user);

        let realmUser = realm.objectForPrimaryKey('User', user.id);
        if (!realmUser || user.updateAt !== realmUser.updateAt) {
            realmUser = realm.create('User', user, true);
        }

        realm.create('General', {
            id: GENERAL_SCHEMA_ID,
            currentUserId: user.id,
            deviceToken: ephemeralStore.deviceToken,
        }, true);

        if (data.preferences?.length) {
            realm.delete(realm.objects('Preference'));
            data.preferences.forEach((pref) => {
                const id = `${pref.category}-${pref.name}`;
                realm.create('Preference', {...pref, id});
            });
        }

        // TODO: Remove members and teams that were deleted on the server
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

                members.push(teamMemberDataToRealm(realmUser, member));
                teamMembersMap.set(member.team_id, members);
            });
        }

        if (data.teams?.length) {
            data.teams.forEach((teamData) => {
                teamData.members = teamMembersMap.get(teamData.id) || [];

                const team = teamDataToRealm(teamData);
                realm.create('Team', team, true);
            });
        }
        break;
    }
    case UserTypes.UPDATE_ME: {
        const data = action.data || action.payload;
        const user = userDataToRealm(data);
        realm.create('User', user, true);
        break;
    }
    default:
        break;
    }
}

export default combineWriters([
    currentUser,
]);
