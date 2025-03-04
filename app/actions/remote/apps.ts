// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {sendEphemeralPost} from '@actions/local/post';
import {AppCallResponseTypes} from '@constants/apps';
import NetworkManager from '@managers/network_manager';
import {cleanForm, createCallRequest, makeCallErrorResponse} from '@utils/apps';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import type {Client} from '@client/rest';
import type PostModel from '@typings/database/models/servers/post';
import type {IntlShape} from 'react-intl';

export async function handleBindingClick<Res=unknown>(serverUrl: string, binding: AppBinding, context: AppContext, intl: IntlShape): Promise<{data?: AppCallResponse<Res>; error?: AppCallResponse<Res>}> {
    // Fetch form
    if (binding.form?.source) {
        const callRequest = createCallRequest(
            binding.form.source,
            context,
        );

        return doAppFetchForm<Res>(serverUrl, callRequest, intl);
    }

    // Open form
    if (binding.form) {
        // This should come properly formed, but using preventive checks
        if (!binding.form?.submit) {
            const errMsg = intl.formatMessage({
                id: 'apps.error.malformed_binding',
                defaultMessage: 'This binding is not properly formed. Contact the App developer.',
            });
            return {error: makeCallErrorResponse<Res>(errMsg)};
        }

        const res: AppCallResponse<Res> = {
            type: AppCallResponseTypes.FORM,
            form: binding.form,
        };
        return {data: res};
    }

    // Submit binding
    // This should come properly formed, but using preventive checks
    if (!binding.submit) {
        const errMsg = intl.formatMessage({
            id: 'apps.error.malformed_binding',
            defaultMessage: 'This binding is not properly formed. Contact the App developer.',
        });
        return {error: makeCallErrorResponse<Res>(errMsg)};
    }

    const callRequest = createCallRequest(
        binding.submit,
        context,
    );

    return doAppSubmit<Res>(serverUrl, callRequest, intl);
}

export async function doAppSubmit<Res=unknown>(serverUrl: string, inCall: AppCallRequest, intl: IntlShape): Promise<{data: AppCallResponse<Res>} | {error: AppCallResponse<Res>}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const call: AppCallRequest = {
            ...inCall,
            context: {
                ...inCall.context,
                track_as_submit: true,
            },
        };
        const res = await client.executeAppCall<Res>(call, true);
        const responseType = res.type || AppCallResponseTypes.OK;

        switch (responseType) {
            case AppCallResponseTypes.OK:
                return {data: res};
            case AppCallResponseTypes.ERROR:
                return {error: res};
            case AppCallResponseTypes.FORM: {
                if (!res.form?.submit) {
                    const errMsg = intl.formatMessage({
                        id: 'apps.error.responses.form.no_form',
                        defaultMessage: 'Response type is `form`, but no valid form was included in response.',
                    });
                    return {error: makeCallErrorResponse<Res>(errMsg)};
                }

                cleanForm(res.form);

                return {data: res};
            }
            case AppCallResponseTypes.NAVIGATE:
                if (!res.navigate_to_url) {
                    const errMsg = intl.formatMessage({
                        id: 'apps.error.responses.navigate.no_url',
                        defaultMessage: 'Response type is `navigate`, but no url was included in response.',
                    });
                    return {error: makeCallErrorResponse<Res>(errMsg)};
                }

                return {data: res};
            default: {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: responseType,
                });
                return {error: makeCallErrorResponse<Res>(errMsg)};
            }
        }
    } catch (error) {
        const errMsg = getFullErrorMessage(error) || intl.formatMessage({
            id: 'apps.error.responses.unexpected_error',
            defaultMessage: 'Received an unexpected error.',
        });
        logDebug('error on doAppSubmit', getFullErrorMessage(error));
        return {error: makeCallErrorResponse<Res>(errMsg)};
    }
}

export async function doAppFetchForm<Res=unknown>(serverUrl: string, call: AppCallRequest, intl: IntlShape) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const res = await client.executeAppCall<Res>(call, false);
        const responseType = res.type || AppCallResponseTypes.OK;

        switch (responseType) {
            case AppCallResponseTypes.ERROR:
                return {error: res};
            case AppCallResponseTypes.FORM:
                if (!res.form?.submit) {
                    const errMsg = intl.formatMessage({
                        id: 'apps.error.responses.form.no_form',
                        defaultMessage: 'Response type is `form`, but no valid form was included in response.',
                    });
                    return {error: makeCallErrorResponse<Res>(errMsg)};
                }
                cleanForm(res.form);
                return {data: res};
            default: {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {type: responseType});
                return {error: makeCallErrorResponse<Res>(errMsg)};
            }
        }
    } catch (error) {
        const errMsg = getFullErrorMessage(error) || intl.formatMessage({
            id: 'apps.error.responses.unexpected_error',
            defaultMessage: 'Received an unexpected error.',
        });
        logDebug('error on doAppFetchForm', getFullErrorMessage(error));
        return {error: makeCallErrorResponse<Res>(errMsg)};
    }
}

export async function doAppLookup<Res=unknown>(serverUrl: string, call: AppCallRequest, intl: IntlShape) {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
        const res = await client.executeAppCall<Res>(call, false);
        const responseType = res.type || AppCallResponseTypes.OK;

        switch (responseType) {
            case AppCallResponseTypes.OK:
                return {data: res};
            case AppCallResponseTypes.ERROR:
                return {error: res};

            default: {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {type: responseType});
                return {error: makeCallErrorResponse<Res>(errMsg)};
            }
        }
    } catch (error: any) {
        const errMsg = getFullErrorMessage(error) || intl.formatMessage({
            id: 'apps.error.responses.unexpected_error',
            defaultMessage: 'Received an unexpected error.',
        });
        logDebug('error on doAppLookup', getFullErrorMessage(error));
        return {error: makeCallErrorResponse<Res>(errMsg)};
    }
}

export function postEphemeralCallResponseForPost(serverUrl: string, response: AppCallResponse, message: string, post: PostModel) {
    return sendEphemeralPost(
        serverUrl,
        message,
        post.channelId,
        post.rootId || post.id,
        response.app_metadata?.bot_user_id,
    );
}

export function postEphemeralCallResponseForChannel(serverUrl: string, response: AppCallResponse, message: string, channelID: string) {
    return sendEphemeralPost(
        serverUrl,
        message,
        channelID,
        '',
        response.app_metadata?.bot_user_id,
    );
}

export function postEphemeralCallResponseForContext(serverUrl: string, response: AppCallResponse, message: string, context: AppContext) {
    return sendEphemeralPost(
        serverUrl,
        message,
        context.channel_id!,
        context.root_id || context.post_id,
        response.app_metadata?.bot_user_id,
    );
}

export function postEphemeralCallResponseForCommandArgs(serverUrl: string, response: AppCallResponse, message: string, args: CommandArgs) {
    return sendEphemeralPost(
        serverUrl,
        message,
        args.channel_id,
        args.root_id,
        response.app_metadata?.bot_user_id,
    );
}
