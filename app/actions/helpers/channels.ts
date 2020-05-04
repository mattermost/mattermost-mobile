// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PreferenceTypes, RoleTypes, UserTypes} from '@mm-redux/action_types';
import {Client4} from '@mm-redux/client';
import {General, Preferences} from '@mm-redux/constants';
import {getCurrentChannelId, getChannel, getMyChannelMember, isManuallyUnread} from '@mm-redux/selectors/entities/channels';
import {getConfig} from '@mm-redux/selectors/entities/general';
import {getMyPreferences} from '@mm-redux/selectors/entities/preferences';
import {getCurrentUserId, getUsers, getUserIdsInChannels} from '@mm-redux/selectors/entities/users';
import {getUserIdFromChannelName, isAutoClosed} from '@mm-redux/utils/channel_utils';
import {getPreferenceKey} from '@mm-redux/utils/preference_utils';

import {ActionResult, GenericAction, Action} from '@mm-redux/types/actions';
import {Channel, ChannelMembership} from '@mm-redux/types/channels';
import {PreferenceType} from '@mm-redux/types/preferences';
import {GlobalState} from '@mm-redux/types/store';
import {UserProfile} from '@mm-redux/types/users';
import {RelationOneToMany} from '@mm-redux/types/utilities';

import {
    receivedChannel,
    receivedMyChannelMember,
    removeManuallyUnread,
    incrementTotalMessageCount,
    incrementUnreadMessageCount,
    incrementUnreadMentionCount,
    decrementUnreadMessageCount,
    decrementUnreadMentionCount,
} from '@actions/channels';

import {isDirectChannelVisible, isGroupChannelVisible} from '@utils/channels';
import {buildPreference} from '@utils/preferences';

export async function loadDirectMessagesActions(state: GlobalState, channels: Channel[], channelMembers: ChannelMembership[]) {
    const currentUserId = getCurrentUserId(state);
    const usersInChannel: RelationOneToMany<Channel, UserProfile> = getUserIdsInChannels(state);
    const directChannels = Object.values(channels).filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
    const prefs: PreferenceType[] = [];
    const promises: Promise<ActionResult>[] = []; //only fetch profiles that we don't have and the Direct channel should be visible
    const actions = [];
    const userIds: string[] = [];

    // Prepare preferences and start fetching profiles to batch them
    directChannels.forEach((c) => {
        const profileIds = Array.from(usersInChannel[c.id] || []);
        const profilesInChannel: string[] = profileIds.filter((u: string) => u !== currentUserId);
        userIds.push(...profilesInChannel);

        switch (c.type) {
        case General.DM_CHANNEL: {
            const dm = fetchDirectMessageProfileIfNeeded(state, c, channelMembers, profilesInChannel);
            if (dm.preferences.length) {
                prefs.push(...dm.preferences);
            }

            if (dm.promise) {
                promises.push(dm.promise);
            }
            break;
        }
        case General.GM_CHANNEL: {
            const gm = fetchGroupMessageProfilesIfNeeded(state, c, channelMembers, profilesInChannel);

            if (gm.preferences.length) {
                prefs.push(...gm.preferences);
            }

            if (gm.promise) {
                promises.push(gm.promise);
            }
            break;
        }
        }
    });

    // Save preferences if there are any changes
    if (prefs.length) {
        Client4.savePreferences(currentUserId, prefs);
        actions.push({
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: prefs,
        });
    }

    const profilesAction = await getProfilesFromPromises(promises);
    const userIdsSet: Set<string> = new Set(userIds);

    if (profilesAction) {
        actions.push(profilesAction);
        profilesAction.data.forEach((d: any) => {
            const {users} = d.data;
            users.forEach((u: UserProfile) => userIdsSet.add(u.id));
        });
    }

    if (userIdsSet.size > 0) {
        try {
            const statuses = await Client4.getStatusesByIds(Array.from(userIdsSet));
            if (statuses.length) {
                actions.push({
                    type: UserTypes.RECEIVED_STATUSES,
                    data: statuses,
                });
            }
        } catch {
            // do nothing (status will get fetched later on regardless)
        }
    }

    return actions;
}

export function markChannelAsViewedAndReadActions(state: GlobalState, channelId: string, prevChannelId: string = '', markOnServer: boolean = true): Action[] {
    const actions = [];
    const {channels, myMembers} = state.entities.channels;
    const channel = channels[channelId];
    const member = myMembers[channelId];
    const prevMember = myMembers[prevChannelId];
    const prevChanManuallyUnread = isManuallyUnread(state, prevChannelId);
    const prevChannel = (!prevChanManuallyUnread && prevChannelId) ? channels[prevChannelId] : null; // May be null since prevChannelId is optional

    if (markOnServer) {
        Client4.viewMyChannel(channelId, prevChanManuallyUnread ? '' : prevChannelId);
    }

    if (member) {
        member.last_viewed_at = Date.now();
        actions.push(receivedMyChannelMember(member));

        if (isManuallyUnread(state, channelId)) {
            actions.push(removeManuallyUnread(channelId));
        }

        if (channel) {
            actions.push(
                decrementUnreadMessageCount(channel, channel.total_msg_count - member.msg_count),
                decrementUnreadMentionCount(channel, member.mention_count),
            );
        }
    }

    if (prevMember) {
        if (!prevChanManuallyUnread) {
            prevMember.last_viewed_at = Date.now();
            actions.push(receivedMyChannelMember(prevMember));
        }

        if (prevChannel) {
            actions.push(
                decrementUnreadMessageCount(prevChannel, prevChannel.total_msg_count - prevMember.msg_count),
                decrementUnreadMentionCount(prevChannel, prevMember.mention_count),
            );
        }
    }

    return actions;
}

export function markChannelAsUnreadActions(state: GlobalState, channelId: string, mentions: string[]): Action[] {
    const currentUserId = getCurrentUserId(state);
    const channel = getChannel(state, channelId);
    const member = getMyChannelMember(state, channelId);

    const onlyMentions = member?.notify_props?.mark_unread === General.MENTION;

    const actions: Action[] = [
        incrementTotalMessageCount(channel.id, 1),
        incrementUnreadMessageCount(channel, 1, onlyMentions),
    ];

    if (mentions && mentions.indexOf(currentUserId) !== -1) {
        actions.push(incrementUnreadMentionCount(channel, 1));
    }

    return actions;
}

export function makeDirectChannelVisibleIfNecessaryAction(state: GlobalState, otherUserId: string): GenericAction|null {
    const myPreferences = getMyPreferences(state);
    const currentUserId = getCurrentUserId(state);

    let preference = myPreferences[getPreferenceKey(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, otherUserId)];

    if (!preference || preference.value === 'false') {
        preference = {
            user_id: currentUserId,
            category: Preferences.CATEGORY_DIRECT_CHANNEL_SHOW,
            name: otherUserId,
            value: 'true',
        };

        return {
            type: PreferenceTypes.RECEIVED_PREFERENCES,
            data: [preference],
        };
    }

    return null;
}

export async function makeGroupMessageVisibleIfNecessaryActions(state: GlobalState, channelId: string): Promise<Action[]> {
    try {
        const myPreferences = getMyPreferences(state);
        const currentUserId = getCurrentUserId(state);

        let preference = myPreferences[getPreferenceKey(Preferences.CATEGORY_GROUP_CHANNEL_SHOW, channelId)];

        if (!preference || preference.value === 'false') {
            preference = {
                user_id: currentUserId,
                category: Preferences.CATEGORY_GROUP_CHANNEL_SHOW,
                name: channelId,
                value: 'true',
            };

            const profilesInChannel = await fetchUsersInChannel(state, channelId);

            return [{
                type: UserTypes.RECEIVED_BATCHED_PROFILES_IN_CHANNEL,
                data: [profilesInChannel],
            }, {
                type: PreferenceTypes.RECEIVED_PREFERENCES,
                data: [preference],
            }];
        }
    } catch {
        // Do nothing
    }

    return [];
}

export async function fetchChannelAndMyMember(channelId: string): Promise<Action[]> {
    const actions: Action[] = [];

    try {
        const [channel, member] = await Promise.all([
            Client4.getChannel(channelId),
            Client4.getMyChannelMember(channelId),
        ]);

        actions.push(
            receivedChannel(channel),
            receivedMyChannelMember(member),
        );

        const roles = await Client4.getRolesByNames(member.roles.split(' '));
        if (roles.length) {
            actions.push({
                type: RoleTypes.RECEIVED_ROLES,
                data: roles,
            });
        }
    } catch {
        // do nothing
    }

    return actions;
}

export function createMemberForNewChannel(channel: Channel, userId: string, roles: string[]): ChannelMembership {
    return {
        channel_id: channel.id,
        user_id: userId,
        roles: roles.join(' '),
        last_viewed_at: 0,
        mention_count: 0,
        msg_count: 0,
        last_update_at: channel.create_at,
        notify_props: {
            desktop: 'default',
            mark_unread: 'all',
        },
    };
}

export async function getAddedDmUsersIfNecessaryActions(state: GlobalState, preferences: PreferenceType[]): Promise<GenericAction[]> {
    const userIds: string[] = [];
    const actions: GenericAction[] = [];

    for (const preference of preferences) {
        if (preference.category === Preferences.CATEGORY_DIRECT_CHANNEL_SHOW && preference.value === 'true') {
            userIds.push(preference.name);
        }
    }

    if (userIds.length !== 0) {
        const profiles = getUsers(state);
        const currentUserId = getCurrentUserId(state);

        const needProfiles: string[] = [];

        for (const userId of userIds) {
            if (!profiles[userId] && userId !== currentUserId) {
                needProfiles.push(userId);
            }
        }

        if (needProfiles.length > 0) {
            const data = await Client4.getProfilesByIds(userIds);
            if (profiles.lenght) {
                actions.push({
                    type: UserTypes.RECEIVED_PROFILES_LIST,
                    data,
                });
            }
        }
    }

    return actions;
}

function fetchDirectMessageProfileIfNeeded(state: GlobalState, channel: Channel, channelMembers: ChannelMembership[], profilesInChannel: string[]) {
    const currentUserId = getCurrentUserId(state);
    const myPreferences = getMyPreferences(state);
    const users = getUsers(state);
    const config = getConfig(state);
    const currentChannelId = getCurrentChannelId(state);
    const otherUserId = getUserIdFromChannelName(currentUserId, channel.name);
    const otherUser = users[otherUserId];
    const dmVisible = isDirectChannelVisible(currentUserId, myPreferences, channel);
    const dmAutoClosed = isAutoClosed(config, myPreferences, channel, channel.last_post_at, otherUser ? otherUser.delete_at : 0, currentChannelId);
    const member = channelMembers.find((cm) => cm.channel_id === channel.id);
    const dmIsUnread = member ? member.mention_count > 0 : false;
    const dmFetchProfile = dmIsUnread || (dmVisible && !dmAutoClosed);
    const preferences = [];

    // when then DM is hidden but has new messages
    if ((!dmVisible || dmAutoClosed) && dmIsUnread) {
        preferences.push(buildPreference(Preferences.CATEGORY_DIRECT_CHANNEL_SHOW, currentUserId, otherUserId));
        preferences.push(buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, channel.id, Date.now().toString()));
    }

    if (dmFetchProfile && !profilesInChannel.includes(otherUserId) && otherUserId !== currentUserId) {
        return {
            preferences,
            promise: fetchUsersInChannel(state, channel.id),
        };
    }

    return {preferences};
}

function fetchGroupMessageProfilesIfNeeded(state: GlobalState, channel: Channel, channelMembers: ChannelMembership[], profilesInChannel: string[]) {
    const currentUserId = getCurrentUserId(state);
    const myPreferences = getMyPreferences(state);
    const config = getConfig(state);
    const gmVisible = isGroupChannelVisible(myPreferences, channel);
    const gmAutoClosed = isAutoClosed(config, myPreferences, channel, channel.last_post_at, 0);
    const channelMember = channelMembers.find((cm) => cm.channel_id === channel.id);
    let hasMentions = false;
    let isUnread = false;

    if (channelMember) {
        hasMentions = channelMember.mention_count > 0;
        isUnread = channelMember.msg_count < channel.total_msg_count;
    }

    const gmIsUnread = hasMentions || isUnread;
    const gmFetchProfile = gmIsUnread || (gmVisible && !gmAutoClosed);
    const preferences = [];

    // when then GM is hidden but has new messages
    if ((!gmVisible || gmAutoClosed) && gmIsUnread) {
        preferences.push(buildPreference(Preferences.CATEGORY_GROUP_CHANNEL_SHOW, currentUserId, channel.id));
        preferences.push(buildPreference(Preferences.CATEGORY_CHANNEL_OPEN_TIME, currentUserId, channel.id, Date.now().toString()));
    }

    if (gmFetchProfile && !profilesInChannel.length) {
        return {
            preferences,
            promise: fetchUsersInChannel(state, channel.id),
        };
    }

    return {preferences};
}

async function fetchUsersInChannel(state: GlobalState, channelId: string): Promise<ActionResult> {
    try {
        const currentUserId = getCurrentUserId(state);
        const profiles = await Client4.getProfilesInChannel(channelId);

        // When fetching profiles in channels we exclude our own user
        const users = profiles.filter((p: UserProfile) => p.id !== currentUserId);
        const data = {
            channelId,
            users,
        };

        return {data};
    } catch (error) {
        return {error};
    }
}

async function getProfilesFromPromises(promises: Promise<ActionResult>[]): Promise<GenericAction | null> {
    // Get the profiles returned by the promises
    if (!promises.length) {
        return null;
    }

    const result = await Promise.all(promises);
    const data = result.filter((p: any) => !p.error);

    return {
        type: UserTypes.RECEIVED_BATCHED_PROFILES_IN_CHANNEL,
        data,
    };
}