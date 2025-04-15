// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {doAppSubmit, postEphemeralCallResponseForCommandArgs} from '@actions/remote/apps';
import {AppCommandParser} from '@components/autocomplete/slash_suggestion/app_command_parser/app_command_parser';
import {AppCallResponseTypes} from '@constants/apps';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import IntegrationsManager from '@managers/integrations_manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById} from '@queries/servers/channel';
import {getConfig, getCurrentTeamId} from '@queries/servers/system';
import {showAppForm} from '@screens/navigation';
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

    const appsEnabled = await AppsManager.isAppsEnabled(serverUrl);
    if (appsEnabled) {
        const parser = new AppCommandParser(serverUrl, intl, channelId, teamId, rootId);
        if (parser.isAppCommand(message)) {
            return executeAppCommand(serverUrl, intl, parser, message, args);
        }
    }

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

    if (data?.trigger_id) { //eslint-disable-line camelcase
        IntegrationsManager.getManager(serverUrl)?.setTriggerId(data.trigger_id);
    }

    return {data};
};

export const executeAppCommand = async (serverUrl: string, intl: IntlShape, parser: AppCommandParser, msg: string, args: CommandArgs) => {
    const {creq, errorMessage} = await parser.composeCommandSubmitCall(msg);
    const createErrorMessage = (errMessage: string) => {
        return {error: {message: errMessage}};
    };

    if (!creq) {
        return createErrorMessage(errorMessage!);
    }

    const res = await doAppSubmit(serverUrl, creq, intl);
    if ('error' in res) {
        const errorResponse = res.error;
        return createErrorMessage(errorResponse.text || intl.formatMessage({
            id: 'apps.error.unknown',
            defaultMessage: 'Unknown error.',
        }));
    }
    const callResp = res.data;

    switch (callResp.type) {
        case AppCallResponseTypes.OK:
            if (callResp.text) {
                postEphemeralCallResponseForCommandArgs(serverUrl, callResp, callResp.text, args);
            }
            return {data: {}};
        case AppCallResponseTypes.FORM:
            if (callResp.form) {
                showAppForm(callResp.form, creq.context);
            }
            return {data: {}};
        case AppCallResponseTypes.NAVIGATE:
            if (callResp.navigate_to_url) {
                handleGotoLocation(serverUrl, intl, callResp.navigate_to_url);
            }
            return {data: {}};
        default:
            return createErrorMessage(intl.formatMessage({
                id: 'apps.error.responses.unknown_type',
                defaultMessage: 'App response type not supported. Response type: {type}.',
            }, {
                type: callResp.type,
            }));
    }
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
        handleDeepLink(match.url, intl, location);
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
