// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {deletePostsForChannel, deletePostsForChannelsWithAutotranslation} from '@actions/local/channel';
import {handleKickFromChannel, type MyChannelsRequest} from '@actions/remote/channel';
import {handleKickFromTeam} from '@actions/remote/team';
import {General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {queryChannelsById, queryMyChannelsByChannelIds} from '@queries/servers/channel';
import {getCurrentChannelId, getCurrentTeamId, getConfigValue, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {NavigationStore} from '@store/navigation_store';
import {isDefaultChannel, isDMorGM, sortChannelsByDisplayName} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {isTablet} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

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

type HandleInitialLoadNavigationOptions = {
    currentTeamId: string;
    currentChannelId: string;
    initialTeamId: string;
    initialChannelId: string;
    removedTeamIds: string[];
    removedChannelIds: string[];
    gmConverted: boolean;
}

/**
 * Navigation handler for the entryInitialLoad (Experience API) path.
 *
 * Works entirely from explicit server data: the server tells us which team is active,
 * which teams/channels were removed, and whether a GM was converted.
 * No DB reads are required to make the navigation decision.
 *
 * handleEntryAfterLoadNavigation (legacy path) delegates here after deriving the
 * same inputs from pre/post DB snapshots and membership lists.
 */
export async function handleInitialLoadNavigation(serverUrl: string, {
    currentTeamId,
    currentChannelId,
    initialTeamId,
    initialChannelId,
    removedTeamIds,
    removedChannelIds,
    gmConverted,
}: HandleInitialLoadNavigationOptions) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const mountedScreens = NavigationStore.getScreensInStack();
        const isChannelScreenMounted = mountedScreens.includes(Screens.CHANNEL);
        const isThreadsMounted = mountedScreens.includes(Screens.THREAD);
        const tabletDevice = isTablet();

        const removedTeamSet = new Set(removedTeamIds);
        const removedChannelSet = new Set(removedChannelIds);

        if (!currentTeamId) {
            // First load — no prior context in DB (e.g. cold start after fresh install or login).
            if (tabletDevice) {
                await setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
            } else {
                await setCurrentTeamAndChannelId(operator, initialTeamId, '');
            }
        } else if (removedTeamSet.has(currentTeamId)) {
            // The current team was explicitly removed by the server.
            await handleKickFromTeam(serverUrl, currentTeamId);
        } else if (currentTeamId !== initialTeamId) {
            // Server resolved a different active team than what the client had.
            if (gmConverted) {
                // Intentional: the active channel was a GM converted to a private/public
                // channel that belongs to a different team.
                await setCurrentTeamAndChannelId(operator, initialTeamId, currentChannelId);
            } else {
                // Current team is no longer accessible — treat as a kick.
                await handleKickFromTeam(serverUrl, currentTeamId);
            }
        } else if (removedChannelSet.has(currentChannelId)) {
            // The current channel was explicitly removed by the server.
            if (tabletDevice || isChannelScreenMounted || isThreadsMounted) {
                await handleKickFromChannel(serverUrl, currentChannelId);
            } else {
                await setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
            }
        } else if (currentChannelId && currentChannelId !== initialChannelId) {
            // Server resolved a different channel (e.g. history led elsewhere).
            if (tabletDevice || isChannelScreenMounted || isThreadsMounted) {
                await handleKickFromChannel(serverUrl, currentChannelId);
            } else {
                await setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
            }
        } else {
            // Team and channel are unchanged — persist the resolved ids.
            await setCurrentTeamAndChannelId(operator, initialTeamId, tabletDevice ? initialChannelId : currentChannelId);
        }
    } catch (error) {
        logDebug('could not manage the initial load navigation', error);
    }
}

/**
 * Navigation handler for the legacy entryRest path.
 *
 * Derives removed teams/channels by diffing membership lists and pre/post DB snapshots,
 * then delegates to handleInitialLoadNavigation for the actual navigation logic.
 */
export async function handleEntryAfterLoadNavigation(
    serverUrl: string,
    teamMembers: TeamMembership[],
    channelMembers: ChannelMember[],
    currentTeamId: string,
    currentChannelId: string,
    initialTeamId: string,
    initialChannelId: string,
    gmConverted: boolean,
) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Read what the DB has after the entry batch completed. These reflect any
        // team/channel switch the user made while the entry was running.
        const currentTeamIdAfterLoad = await getCurrentTeamId(database);
        const currentChannelIdAfterLoad = await getCurrentChannelId(database);

        // Derive removed team ids: teams the user switched to during loading that are
        // no longer in their membership list (delete_at > 0 means removed).
        const removedTeamIds: string[] = [];
        if (currentTeamIdAfterLoad && currentTeamIdAfterLoad !== currentTeamId) {
            const stillMember = teamMembers.find((t) => t.team_id === currentTeamIdAfterLoad && t.delete_at === 0);
            if (!stillMember) {
                removedTeamIds.push(currentTeamIdAfterLoad);
            }
        } else if (currentTeamIdAfterLoad && currentTeamIdAfterLoad !== initialTeamId && !gmConverted) {
            removedTeamIds.push(currentTeamIdAfterLoad);
        }

        // Derive removed channel ids: channels the user switched to during loading that
        // are no longer in their channel membership list.
        const removedChannelIds: string[] = [];
        if (currentChannelIdAfterLoad && currentChannelIdAfterLoad !== currentChannelId) {
            const stillMember = channelMembers.find((m) => m.channel_id === currentChannelIdAfterLoad);
            if (!stillMember) {
                removedChannelIds.push(currentChannelIdAfterLoad);
            }
        } else if (currentChannelIdAfterLoad && currentChannelIdAfterLoad !== initialChannelId) {
            removedChannelIds.push(currentChannelIdAfterLoad);
        }

        await handleInitialLoadNavigation(serverUrl, {
            currentTeamId: currentTeamIdAfterLoad ?? '',
            currentChannelId: currentChannelIdAfterLoad ?? '',
            initialTeamId,
            initialChannelId,
            removedTeamIds,
            removedChannelIds,
            gmConverted,
        });
    } catch (error) {
        logDebug('could not manage the entry after load navigation', error);
    }
}
