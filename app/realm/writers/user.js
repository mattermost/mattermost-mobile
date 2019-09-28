// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {General} from 'app/constants';
import {PreferenceTypes, UserTypes} from 'app/realm/action_types';
import EphemeralStore from 'app/store/ephemeral_store';
import {userDataToRealm} from 'app/realm/utils/user';

import {mapTeamMembers, removeTeamMemberships, createOrUpdateTeams} from './team';

function resetPreferences(realm, data) {
    if (data.preferences?.length) {
        realm.delete(realm.objects('Preference'));
        data.preferences.forEach((pref) => {
            const id = `${pref.category}-${pref.name}`;
            realm.create('Preference', {...pref, id});
        });
    }
}

function storeProfile(realm, profile) {
    let user = realm.objectForPrimaryKey('User', profile.id);
    if (!user || user.updateAt !== profile.update_at || user.status !== profile.status) {
        user = realm.create('User', userDataToRealm(profile), true);
    }

    return user;
}

function currentUserWriter(realm, action) {
    switch (action.type) {
    case UserTypes.RECEIVED_ME: {
        const data = action.data || action.payload;
        const user = storeProfile(realm, data.user);

        let realmGeneral = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        if (realmGeneral) {
            realmGeneral.currentUserId = user.id;
            realmGeneral.deviceToken = EphemeralStore.deviceToken;
        } else {
            realmGeneral = realm.create('General', {
                id: General.REALM_SCHEMA_ID,
                currentUserId: user.id,
                deviceToken: EphemeralStore.deviceToken,
            }, true);
        }

        resetPreferences(realm, data);

        const teamMembersMap = mapTeamMembers(data, user);

        // Remove membership from teams
        removeTeamMemberships(realm, realmGeneral, user, teamMembersMap);

        createOrUpdateTeams(realm, data, teamMembersMap);
        break;
    }

    case UserTypes.UPDATE_ME: {
        const data = action.data || action.payload;
        storeProfile(realm, data);
        break;
    }

    case PreferenceTypes.RECEIVED_PREFERENCES: {
        const data = action.data || action.payload;
        data.forEach((p) => {
            const preference = {
                id: `${p.category}-${p.name}`,
                ...p,
            };

            realm.create('Preference', preference, true);
        });

        break;
    }

    default:
        break;
    }
}

function profilesWriter(realm, action) {
    switch (action.type) {
    case UserTypes.RECEIVED_PROFILES: {
        const data = action.data || action.payload;
        data.users.forEach((u) => {
            const status = data.statuses?.find((s) => s.user_id === u.id);
            if (status) {
                u.status = status.status;
            }

            storeProfile(realm, u);
        });
        break;
    }

    case UserTypes.RECEIVED_PROFILES_IN_CHANNEL: {
        const data = action.data || action.payload;
        const {channelId, profiles, statuses} = data;
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        const channel = realm.objectForPrimaryKey('Channel', channelId);

        if (channel) {
            profiles.forEach((profile) => {
                if (profile.id !== general.currentUserId) {
                    const status = statuses.find((s) => s.user_id === profile.id);
                    const user = storeProfile(realm, {...profile, ...status});

                    const channelMember = realm.objectForPrimaryKey('ChannelMember', `${channelId}-${profile.id}`);
                    if (!channelMember) {
                        const member = {
                            id: `${channelId}-${profile.id}`,
                            user,
                        };

                        channel.members.push(member);
                    }
                }
            });
        }
        break;
    }

    default:
        break;
    }
}

export default combineWriters([
    currentUserWriter,
    profilesWriter,
]);
