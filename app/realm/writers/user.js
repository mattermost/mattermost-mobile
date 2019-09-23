// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import {General} from 'app/constants';
import {PreferenceTypes, UserTypes} from 'app/realm/action_types';
import ephemeralStore from 'app/store/ephemeral_store';
import {userDataToRealm} from 'app/realm/utils/user';

import {
    addMembersToTeam,
    createOrUpdateTeams,
    mapTeamMemberships,
    mapUserToTeamMembers,
    removeTeamMembershipsIfNeeded,
    removeUserTeamMembershipsIfNeeded,
} from './team';

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

function storeProfilesAndMembers(realm, general, data) {
    const {channelId, profiles, statuses} = data;
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
}

function currentUserWriter(realm, action) {
    switch (action.type) {
    case UserTypes.RECEIVED_ME: {
        const data = action.data || action.payload;
        const user = storeProfile(realm, data.user);

        let realmGeneral = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        if (realmGeneral) {
            realmGeneral.currentUserId = user.id;
            realmGeneral.deviceToken = ephemeralStore.deviceToken;
        } else {
            realmGeneral = realm.create('General', {
                id: General.REALM_SCHEMA_ID,
                currentUserId: user.id,
                deviceToken: ephemeralStore.deviceToken,
            }, true);
        }

        resetPreferences(realm, data);

        const teamMembersMap = mapUserToTeamMembers(data, user);

        // Remove membership from teams
        removeUserTeamMembershipsIfNeeded(realm, realmGeneral, user, teamMembersMap);

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
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

        data.profiles.forEach((profile) => {
            if (profile !== general.currentUserId) {
                const status = data.statuses?.find((s) => s.user_id === profile.id);
                if (status) {
                    profile.status = status.status;
                }

                storeProfile(realm, profile);
            }
        });
        break;
    }

    case UserTypes.RECEIVED_PROFILES_IN_CHANNEL: {
        const data = action.data || action.payload;
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);
        storeProfilesAndMembers(realm, general, data);
        break;
    }

    case UserTypes.RECEIVED_BATCH_PROFILES_IN_CHANNEL: {
        const batch = action.data || action.payload;
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

        batch.forEach((item) => {
            if (item?.data) {
                storeProfilesAndMembers(realm, general, item.data);
            }
        });
        break;
    }

    case UserTypes.RECEIVE_PROFILES_IN_TEAM: {
        const data = action.data || action.payload;
        const {profiles, teamId} = data;
        const general = realm.objectForPrimaryKey('General', General.REALM_SCHEMA_ID);

        if (profiles?.length) {
            const teamMembers = profiles.reduce((result, profile) => {
                // Skip the current user
                if (profile.id !== general.currentUserId) {
                    const status = data.statuses?.find((s) => s.user_id === profile.id);
                    if (status) {
                        profile.status = status.status;
                    }

                    storeProfile(realm, profile);

                    return {
                        user_id: profile.id,
                        team_id: teamId,
                        delete_at: profile.delete_at,
                    };
                }
                return result;
            }, []);

            const allUsers = realm.objects('User');
            const teamMembersMap = mapTeamMemberships({teamMembers}, allUsers);

            removeTeamMembershipsIfNeeded(realm, general, teamMembersMap);
            addMembersToTeam(realm, teamId, teamMembersMap);
        }
        break;
    }

    case UserTypes.RECEIVED_STATUS: {
        const data = action.data || action.payload;
        const user = realm.objectForPrimaryKey('User', data?.user_id); //eslint-disable-line camelcase

        if (user && data?.status) {
            user.status = data.status;
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
