// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {getSessions} from '@actions/remote/session';
import {ConfigAndLicenseRequest, fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {setCurrentTeamAndChannelId} from '@queries/servers/system';
import {isTablet} from '@utils/helpers';
import {logDebug, logWarning} from '@utils/log';
import {scheduleExpiredNotification} from '@utils/notification';

import {deferredAppEntryActions, entry} from './common';
import {graphQLCommon} from './gql_common';

import type {Client} from '@client/rest';

type AfterLoginArgs = {
    serverUrl: string;
    user: UserProfile;
    deviceToken?: string;
}

type SpecificAfterLoginArgs = {
    serverUrl: string;
    user: UserProfile;
    clData: ConfigAndLicenseRequest;
}

export async function loginEntry({serverUrl, user, deviceToken}: AfterLoginArgs): Promise<{error?: any; hasTeams?: boolean; time?: number}> {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    if (deviceToken) {
        try {
            client.attachDevice(deviceToken);
        } catch {
            // do nothing, the token could've failed to attach to the session but is not a blocker
        }
    }

    try {
        const clData = await fetchConfigAndLicense(serverUrl, true);
        if (clData.error) {
            return {error: clData.error};
        }

        // schedule local push notification if needed
        if (clData.config) {
            if (clData.config.ExtendSessionLengthWithActivity !== 'true') {
                const timeOut = setTimeout(async () => {
                    clearTimeout(timeOut);
                    let sessions: Session[]|undefined;

                    try {
                        sessions = await getSessions(serverUrl, 'me');
                    } catch (e) {
                        logWarning('Failed to get user sessions', e);
                        return;
                    }

                    if (sessions && Array.isArray(sessions)) {
                        scheduleExpiredNotification(sessions, clData.config?.SiteName || serverUrl, user.locale);
                    }
                }, 500);
            }
        }

        if (clData.config?.FeatureFlagGraphQL === 'true') {
            const result = await graphQLCommon(serverUrl, false, '', '');
            if (!result.error) {
                return result;
            }
            logDebug('Error using GraphQL, trying REST', result.error);
        }

        return restLoginEntry({serverUrl, user, clData});
    } catch (error) {
        return {error};
    }
}

const restLoginEntry = async ({serverUrl, user, clData}: SpecificAfterLoginArgs) => {
    const dt = Date.now();

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const entryData = await entry(serverUrl, '', '');

    if ('error' in entryData) {
        return {error: entryData.error};
    }

    const isTabletDevice = await isTablet();

    const {models, initialTeamId, initialChannelId, prefData, teamData, chData} = entryData;

    let switchToChannel = false;
    if (initialChannelId && isTabletDevice) {
        switchToChannel = true;
        switchToChannelById(serverUrl, initialChannelId, initialTeamId);
    } else {
        setCurrentTeamAndChannelId(operator, initialTeamId, '');
    }

    await operator.batchRecords(models);

    const config = clData.config || {} as ClientConfig;
    const license = clData.license || {} as ClientLicense;
    deferredAppEntryActions(serverUrl, 0, user.id, user.locale, prefData.preferences, config, license, teamData, chData, initialTeamId, switchToChannel ? initialChannelId : undefined);

    return {time: Date.now() - dt, hasTeams: Boolean(teamData.teams?.length)};
};
