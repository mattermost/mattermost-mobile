// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Alert} from 'react-native';

import {IntegrationTypes} from '@mm-redux/action_types';
import {General} from '../constants';
import {Client4} from '@mm-redux/client';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import {getCurrentChannelId} from '@mm-redux/selectors/entities/channels';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {analytics} from '@init/analytics.ts';

import {batchActions, DispatchFunc, GetStateFunc, ActionFunc} from '@mm-redux/types/actions';

import {Command, DialogSubmission, IncomingWebhook, OAuthApp, OutgoingWebhook} from '@mm-redux/types/integrations';

import {logError} from './errors';
import {bindClientFunc, forceLogoutIfNecessary, requestSuccess, requestFailure} from './helpers';
import {makeGroupMessageVisibleIfNecessary} from './preferences';
import {handleSelectChannel, handleSelectChannelByName, loadChannelsByTeamName} from '@actions/views/channel';
import {makeDirectChannel} from '@actions/views/more_dms';
import {showPermalink} from '@actions/views/permalink';
import {DeepLinkTypes} from '@constants';
import {getUserByUsername} from '@mm-redux/actions/users';
import {getConfig, getCurrentUrl} from '@mm-redux/selectors/entities/general';
import * as DraftUtils from '@utils/draft';
import {permalinkBadTeam} from '@utils/general';
import {getURLAndMatch, tryOpenURL} from '@utils/url';

export function createIncomingHook(hook: IncomingWebhook): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.createIncomingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_INCOMING_HOOK],
        params: [
            hook,
        ],
    });
}

export function getIncomingHook(hookId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getIncomingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_INCOMING_HOOK],
        params: [
            hookId,
        ],
    });
}

export function getIncomingHooks(teamId = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getIncomingWebhooks,
        onSuccess: [IntegrationTypes.RECEIVED_INCOMING_HOOKS],
        params: [
            teamId,
            page,
            perPage,
        ],
    });
}

export function removeIncomingHook(hookId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.removeIncomingWebhook(hookId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_INCOMING_HOOK,
                data: {id: hookId},
            },
        ]));

        return {data: true};
    };
}

export function updateIncomingHook(hook: IncomingWebhook): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.updateIncomingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_INCOMING_HOOK],
        params: [
            hook,
        ],
    });
}

export function createOutgoingHook(hook: OutgoingWebhook): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.createOutgoingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hook,
        ],
    });
}

export function getOutgoingHook(hookId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getOutgoingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hookId,
        ],
    });
}

export function getOutgoingHooks(channelId = '', teamId = '', page = 0, perPage: number = General.PAGE_SIZE_DEFAULT): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getOutgoingWebhooks,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOKS],
        params: [
            channelId,
            teamId,
            page,
            perPage,
        ],
    });
}

export function removeOutgoingHook(hookId: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.removeOutgoingWebhook(hookId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_OUTGOING_HOOK,
                data: {id: hookId},
            },
        ]));

        return {data: true};
    };
}

export function updateOutgoingHook(hook: OutgoingWebhook): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.updateOutgoingWebhook,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hook,
        ],
    });
}

export function regenOutgoingHookToken(hookId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.regenOutgoingHookToken,
        onSuccess: [IntegrationTypes.RECEIVED_OUTGOING_HOOK],
        params: [
            hookId,
        ],
    });
}

export function getCommands(teamId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getCommandsList,
        onSuccess: [IntegrationTypes.RECEIVED_COMMANDS],
        params: [
            teamId,
        ],
    });
}

export function getAutocompleteCommands(teamId: string, page = 0, perPage: number = General.PAGE_SIZE_DEFAULT): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getAutocompleteCommandsList,
        onSuccess: [IntegrationTypes.RECEIVED_COMMANDS],
        params: [
            teamId,
            page,
            perPage,
        ],
    });
}

export function getCommandAutocompleteSuggestions(userInput: string, teamId: string, commandArgs: any): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        let data: any = null;
        try {
            analytics.trackCommand('get_suggestions_initiated', userInput);
            data = await Client4.getCommandAutocompleteSuggestionsList(userInput, teamId, commandArgs);
        } catch (error) {
            analytics.trackCommand('get_suggestions_failed', userInput, error.message);
            dispatch(batchActions([logError(error), requestFailure(IntegrationTypes.RECEIVED_COMMAND_SUGGESTIONS_FAILURE, error)]));
            return {error};
        }
        analytics.trackCommand('get_suggestions_success', userInput);
        dispatch(requestSuccess(IntegrationTypes.RECEIVED_COMMAND_SUGGESTIONS, data));
        return {data};
    };
}

export function getCustomTeamCommands(teamId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getCustomTeamCommands,
        onSuccess: [IntegrationTypes.RECEIVED_CUSTOM_TEAM_COMMANDS],
        params: [
            teamId,
        ],
    });
}

export function addCommand(command: Command): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.addCommand,
        onSuccess: [IntegrationTypes.RECEIVED_COMMAND],
        params: [
            command,
        ],
    });
}

export function editCommand(command: Command): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.editCommand,
        onSuccess: [IntegrationTypes.RECEIVED_COMMAND],
        params: [
            command,
        ],
    });
}

export function executeCommand(command: Command, args: Array<string>): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.executeCommand,
        params: [
            command,
            args,
        ],
    });
}

export function regenCommandToken(id: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let res;
        try {
            res = await Client4.regenCommandToken(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.RECEIVED_COMMAND_TOKEN,
                data: {
                    id,
                    token: res.token,
                },
            },
        ]));

        return {data: true};
    };
}

export function deleteCommand(id: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.deleteCommand(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_COMMAND,
                data: {id},
            },
        ]));

        return {data: true};
    };
}

export function addOAuthApp(app: OAuthApp): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.createOAuthApp,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APP],
        params: [
            app,
        ],
    });
}

export function editOAuthApp(app: OAuthApp): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.editOAuthApp,
        onSuccess: IntegrationTypes.RECEIVED_OAUTH_APP,
        params: [
            app,
        ],
    });
}

export function getOAuthApps(page = 0, perPage: number = General.PAGE_SIZE_DEFAULT): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getOAuthApps,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APPS],
        params: [
            page,
            perPage,
        ],
    });
}

export function getOAuthApp(appId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.getOAuthApp,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APP],
        params: [
            appId,
        ],
    });
}

export function getAuthorizedOAuthApps(): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const currentUserId = getCurrentUserId(state);

        let data;
        try {
            data = await Client4.getAuthorizedOAuthApps(currentUserId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));

            return {error};
        }

        return {data};
    };
}

export function deauthorizeOAuthApp(clientId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.deauthorizeOAuthApp,
        params: [clientId],
    });
}

export function deleteOAuthApp(id: string): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.deleteOAuthApp(id);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        dispatch(batchActions([
            {
                type: IntegrationTypes.DELETED_OAUTH_APP,
                data: {id},
            },
        ]));

        return {data: true};
    };
}

export function regenOAuthAppSecret(appId: string): ActionFunc {
    return bindClientFunc({
        clientFunc: Client4.regenOAuthAppSecret,
        onSuccess: [IntegrationTypes.RECEIVED_OAUTH_APP],
        params: [
            appId,
        ],
    });
}

export function submitInteractiveDialog(submission: DialogSubmission): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        submission.channel_id = getCurrentChannelId(state);
        submission.team_id = getCurrentTeamId(state);

        let data;
        try {
            data = await Client4.submitInteractiveDialog(submission);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);

            dispatch(logError(error));
            return {error};
        }

        return {data};
    };
}

export function handleGotoLocation(href: string, intl: any): ActionFunc {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        const state = getState();
        const config = getConfig(state);

        const {url, match} = await getURLAndMatch(href, getCurrentUrl(state), config.SiteURL);

        if (match) {
            switch (match.type) {
            case DeepLinkTypes.CHANNEL:
                dispatch(handleSelectChannelByName(match.channelName, match.teamName, () => DraftUtils.errorBadChannel(intl), intl));
                break;
            case DeepLinkTypes.PERMALINK: {
                const {error} = await dispatch(loadChannelsByTeamName(match.teamName, () => permalinkBadTeam(intl)));
                if (!error && match.postId) {
                    dispatch(showPermalink(intl, match.teamName, match.postId));
                }
                break;
            }
            case DeepLinkTypes.DMCHANNEL: {
                if (!match.userName) {
                    DraftUtils.errorBadUser(intl);
                    return {data: false};
                }

                const {data} = await dispatch(getUserByUsername(match.userName));
                if (!data) {
                    DraftUtils.errorBadUser(intl);
                    return {data: false};
                }
                dispatch(makeDirectChannel(data.id));
                break;
            }
            case DeepLinkTypes.GROUPCHANNEL:
                if (!match.id) {
                    DraftUtils.errorBadChannel(intl);
                    return {data: false};
                }
                dispatch(makeGroupMessageVisibleIfNecessary(match.id));
                dispatch(handleSelectChannel(match.id));
                break;
            }
        } else {
            const {formatMessage} = this.context.intl;
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

            tryOpenURL(url, onError);
        }
        return {data: true};
    };
}
