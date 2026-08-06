// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import DatabaseManager from '@database/manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {getConfig, getCurrentTeamId} from '@queries/servers/system';
import {handleDeepLink, matchDeepLink} from '@utils/deep_link';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';
import {tryOpenURL} from '@utils/url';

import type {Client} from '@client/rest';
import type {IntlShape} from 'react-intl';

export const executeCommand = async (serverUrl: string, intl: IntlShape, message: string, channelId: string, rootId?: string): Promise<{data?: CommandResponse; error?: unknown}> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const channel = await getChannelById(database, channelId);
    const teamId = channel?.teamId || (await getCurrentTeamId(database));

    const args: CommandArgs = {
        channel_id: channelId,
        team_id: teamId,
        root_id: rootId,
        parent_id: rootId,
    };

    let msg = filterEmDashForCommand(message);

    let cmdLength = msg.indexOf(' ');
    if (cmdLength < 0) {
        cmdLength = msg.length;
    }

    const cmd = msg.substring(0, cmdLength).toLowerCase();
    if (cmd === '/code') {
        msg = cmd + ' ' + msg.substring(cmdLength, msg.length).trimEnd();
    } else {
        msg = cmd + ' ' + msg.substring(cmdLength, msg.length).trim();
    }

    let data;
    try {
        data = await client.executeCommand(msg, args);
    } catch (error) {
        logDebug('error on executeCommand', getFullErrorMessage(error));
        return {error};
    }

    if (data?.trigger_id) {
        IntegrationsManager.getManager(serverUrl)?.setTriggerId(data.trigger_id);
    }

    return {data};
};

const filterEmDashForCommand = (command: string): string => {
    return command.replace(/\u2014/g, '--');
};

export const handleGotoLocation = async (serverUrl: string, intl: IntlShape, location: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const config = await getConfig(database);
    const match = matchDeepLink(location, serverUrl, config?.SiteURL);

    if (match) {
        handleDeepLink(match, intl, location);
    } else {
        const {formatMessage} = intl;
        const onError = () => Alert.alert(
            formatMessage({
                id: 'mobile.server_link.error.title',
                defaultMessage: 'Link Error',
            }),
            formatMessage({
                id: 'mobile.server_link.error.text',
                defaultMessage: 'The link could not be found on this server.',
            }),
        );

        tryOpenURL(location, onError);
    }
    return {data: true};
};

export const fetchCommands = async (serverUrl: string, teamId: string): Promise<{commands: Command[]} | {error: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return {commands: await client.getCommandsList(teamId)};
    } catch (error) {
        logDebug('error on fetchCommands', getFullErrorMessage(error));
        return {error};
    }
};

export const fetchSuggestions = async (serverUrl: string, term: string, teamId: string, channelId: string, rootId?: string): Promise<{suggestions: AutocompleteSuggestion[]} | {error: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return {suggestions: await client.getCommandAutocompleteSuggestionsList(term, teamId, channelId, rootId)};
    } catch (error) {
        logDebug('error on fetchSuggestions', getFullErrorMessage(error));
        return {error};
    }
};
