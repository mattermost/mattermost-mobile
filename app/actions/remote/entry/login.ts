// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {switchToChannelById} from '@actions/remote/channel';
import {getSessions} from '@actions/remote/session';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {setCurrentTeamAndChannelId} from '@queries/servers/system';
import {isTablet} from '@utils/helpers';
import {logWarning} from '@utils/log';
import {scheduleExpiredNotification} from '@utils/notification';

import {deferredAppEntryActions, entry} from './gql_common';

import type {Client} from '@client/rest';

type AfterLoginArgs = {
    serverUrl: string;
    user: UserProfile;
    deviceToken?: string;
}

export async function loginEntry({serverUrl, user, deviceToken}: AfterLoginArgs): Promise<{error?: any; hasTeams?: boolean; time?: number}> {
    const dt = Date.now();

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
        const clData = await fetchConfigAndLicense(serverUrl, false);
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

        const entryData = await entry(serverUrl, '', '');

        if ('error' in entryData) {
            return {error: entryData.error};
        }

        const {models, initialTeamId, initialChannelId, prefData, teamData, chData} = entryData;

        const isTabletDevice = await isTablet();

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
    } catch (error) {
        return {error};
    }
}
