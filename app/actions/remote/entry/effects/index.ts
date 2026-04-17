// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deletePostsForChannel, deletePostsForChannelsWithAutotranslation} from '@actions/local/channel';
import {General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {queryChannelsById, queryMyChannelsByChannelIds} from '@queries/servers/channel';
import {getConfigValue} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {isDefaultChannel, isDMorGM, sortChannelsByDisplayName} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';

import type {MyChannelsRequest} from '@actions/remote/channel';
import type {MyUserRequest} from '@actions/remote/user';
import type {Database} from '@nozbe/watermelondb';

export async function handleAutotranslationChanges(serverUrl: string, meData: MyUserRequest | undefined, chData: MyChannelsRequest | undefined) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Config changes already handled in storeConfigAndLicense
        const enableAutoTranslation = (await getConfigValue(operator.database, 'EnableAutoTranslation')) === 'true';
        if (!enableAutoTranslation) {
            return;
        }

        // If user locale changed, delete all the posts for all channels with autotranslation enabled
        // so the posts can be refetch with the new translation
        if (meData) {
            const currentUser = await getCurrentUser(database);
            if (currentUser && meData.user?.locale !== currentUser.locale) {
                await deletePostsForChannelsWithAutotranslation(serverUrl);
                return;
            }
        }

        if (chData) {
            // If a channel stop being autotranslated by the admin, delete the posts for that channel
            // so the posts can be refetch without the translation
            const newChannels = chData.channels || [];
            const channels = await queryChannelsById(database, newChannels.map((c) => c.id)).fetch();
            const chMap = new Map(channels.map((c) => [c.id, c]));
            const promises = [];
            for (const ch of newChannels) {
                const channel = chMap.get(ch.id);
                if (channel && channel.autotranslation && !ch.autotranslation) { // Autotranslation disabled
                    promises.push(deletePostsForChannel(serverUrl, ch.id, true));
                }
            }
            const chModels = (await Promise.all(promises)).map((m) => m.models).flat();
            if (chModels.length) {
                await operator.batchRecords(chModels, 'handleAutotranslationChanges');
            }

            // If a channel starts or stops being autotranslated by the user, delete the posts for that channel
            // so the posts can be refetch with or without the translation
            const newMemberships = chData.memberships || [];
            const memberships = await queryMyChannelsByChannelIds(database, newMemberships.map((m) => m.channel_id)).fetch();
            const membershipMap = new Map(memberships.map((m) => [m.id, m]));
            for (const m of newMemberships) {
                const membership = membershipMap.get(m.channel_id);
                if (membership && membership.autotranslationDisabled !== Boolean(m.autotranslation_disabled)) { // Autotranslation modified
                    promises.push(deletePostsForChannel(serverUrl, m.channel_id, true));
                }
            }
            const membershipModels = (await Promise.all(promises)).map((m) => m.models).flat();
            if (membershipModels.length) {
                await operator.batchRecords(membershipModels, 'handleAutotranslationChanges');
            }
        }
    } catch (error) {
        logError('handleAutotranslationChanges', getFullErrorMessage(error));
    }
}

export async function entryInitialChannelId(database: Database, requestedChannelId = '', requestedTeamId = '', initialTeamId: string, locale: string, channels?: Channel[], memberships?: ChannelMember[]) {
    const membershipIds = new Set(memberships?.map((m) => m.channel_id));
    const requestedChannel = channels?.find((c) => (c.id === requestedChannelId) && membershipIds.has(c.id));

    // If team and channel are the requested, return the channel
    if (initialTeamId === requestedTeamId && requestedChannel) {
        return requestedChannelId;
    }

    // DM or GMs don't care about changes in teams, so return directly
    if (requestedChannel && isDMorGM(requestedChannel)) {
        return requestedChannelId;
    }

    // Check if we are still members of any channel on the history
    const teamChannelHistory = await getTeamChannelHistory(database, initialTeamId);
    for (const c of teamChannelHistory) {
        if (membershipIds.has(c) || c === Screens.GLOBAL_THREADS || c === Screens.GLOBAL_DRAFTS) {
            return c;
        }
    }

    // Check if we are member of the default channel.
    const defaultChannel = channels?.find((c) => isDefaultChannel(c) && c.team_id === initialTeamId);
    const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel && membershipIds.has(defaultChannel.id));
    if (iAmMemberOfTheTeamDefaultChannel) {
        return defaultChannel!.id;
    }

    // Get the first channel of the list, based on the locale.
    const myFirstTeamChannel = channels?.filter((c) =>
        c.team_id === requestedTeamId &&
        c.type === General.OPEN_CHANNEL &&
        membershipIds.has(c.id),
    ).sort(sortChannelsByDisplayName.bind(null, locale))[0];
    return myFirstTeamChannel?.id || '';
}
