// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchChannelById, fetchMyChannelsForTeam, type MyChannelsRequest} from '@actions/remote/channel';
import {fetchMyPreferences} from '@actions/remote/preference';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchMyTeams, type MyTeamsRequest} from '@actions/remote/team';
import {fetchMe, type MyUserRequest} from '@actions/remote/user';
import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import {getChannelById} from '@queries/servers/channel';
import {prepareEntryModels, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {getLastFullSync} from '@queries/servers/system';
import {logDebug, logError} from '@utils/log';
import {processIsCRTEnabled} from '@utils/thread';

import {entryInitialChannelId, handleAutotranslationChanges} from './effects';

import type {EntryResponse} from './types';

export const entryRest = async (serverUrl: string, teamId?: string, channelId?: string, since = 0, groupLabel?: RequestGroupLabel): Promise<EntryResponse> => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let lastDisconnectedAt = since || await getLastFullSync(database);

        const [confResp, prefData] = await Promise.all([
            fetchConfigAndLicense(serverUrl, false, groupLabel),
            fetchMyPreferences(serverUrl, true, groupLabel),
        ]);

        const isCRTEnabled = Boolean(prefData.preferences && processIsCRTEnabled(prefData.preferences, confResp.config?.CollapsedThreads, confResp.config?.FeatureFlagCollapsedThreads, confResp.config?.Version));
        if (prefData.preferences) {
            const crtToggled = await getHasCRTChanged(database, prefData.preferences);
            if (crtToggled) {
                const currentServerUrl = await DatabaseManager.getActiveServerUrl();
                const isSameServer = currentServerUrl === serverUrl;
                if (isSameServer) {
                    lastDisconnectedAt = 0;
                }
                const {error} = await truncateCrtRelatedTables(serverUrl);

                if (error) {
                    throw new Error(`Resetting CRT on ${serverUrl} failed`);
                }
            }
        }

        // let's start fetching in parallel all we can
        const promises: [Promise<MyTeamsRequest>, Promise<MyUserRequest>] = [
            fetchMyTeams(serverUrl, true, groupLabel),
            fetchMe(serverUrl, true, groupLabel),
        ];

        const [teamData, meData] = await Promise.all(promises);
        const error = confResp.error || prefData.error || teamData.error || meData.error;
        if (error) {
            return {error};
        }

        let initialTeamId = teamId || '';
        let initialChannelId = channelId || '';
        let gmConverted = false;

        if (channelId) {
            const existingChannel = await getChannelById(database, channelId);
            if (existingChannel && existingChannel.type === General.GM_CHANNEL) {
                // Okay, so now we know the channel exists in mobile app's database as a GM.
                // We now need to also check if channel on server is actually a private channel,
                // and if so, which team does it belong to now. That team will become the
                // active team on mobile app after this point.

                const fetchResult = await fetchChannelById(serverUrl, channelId);

                // Although you can convert GM only to a private channel, a private channel can further be converted to a public channel.
                // So between the mobile app being on the GM and reconnecting,
                // it may have become either a public or a private channel. So we need to check for both.
                if (fetchResult.channel?.type === General.PRIVATE_CHANNEL || fetchResult.channel?.type === General.OPEN_CHANNEL) {
                    initialTeamId = fetchResult.channel.team_id;
                    initialChannelId = channelId;
                    gmConverted = true;
                }
            }
        }

        if (!teamData.error && teamData.teams?.length === 0) {
            initialTeamId = '';
        }

        const inTeam = teamData.teams?.find((t) => t.id === initialTeamId);
        if (initialTeamId && !inTeam && !teamData.error) {
            initialTeamId = '';
        }

        if (!initialTeamId && teamData.teams?.length && teamData.memberships?.length) {
            // If no initial team was set in the database but got teams in the response
            const teamOrderPreference = getPreferenceValue<string>(prefData.preferences || [], Preferences.CATEGORIES.TEAMS_ORDER, '', '');
            const teamMembers = new Set(teamData.memberships.filter((m) => m.delete_at === 0).map((m) => m.team_id));
            const myTeams = teamData.teams.filter((t) => teamMembers.has(t.id));
            const defaultTeam = selectDefaultTeam(myTeams, meData.user?.locale || DEFAULT_LOCALE, teamOrderPreference, confResp.config?.ExperimentalPrimaryTeam);
            if (defaultTeam?.id) {
                initialTeamId = defaultTeam.id;
            }
        }

        let chData: MyChannelsRequest = {
            channels: [],
            memberships: [],
            categories: [],
        };
        if (initialTeamId) {
            chData = await fetchMyChannelsForTeam(serverUrl, initialTeamId, false, lastDisconnectedAt, true, false, isCRTEnabled, groupLabel);
        }

        initialChannelId = await entryInitialChannelId(database, initialChannelId, teamId, initialTeamId, meData?.user?.locale || '', chData?.channels, chData?.memberships);

        const initialTeamData = initialTeamId ? {
            teams: teamData.teams?.filter((t) => t.id === initialTeamId),
            memberships: teamData.memberships?.filter((m) => m.team_id === initialTeamId),
        } : teamData;

        const dt = Date.now();

        await handleAutotranslationChanges(serverUrl, meData, chData);

        const modelPromises = await prepareEntryModels({operator, teamData: initialTeamData, chData, prefData, meData, isCRTEnabled});
        const models = (await Promise.all(modelPromises)).flat();
        logDebug('Process models on entry', groupLabel, models.length, `${Date.now() - dt}ms`);

        return {models, initialChannelId, initialTeamId, prefData, teamData, chData, meData, gmConverted};
    } catch (error) {
        logError('entryRest', groupLabel, error);
        return {error};
    }
};
