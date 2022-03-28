// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {IntlShape} from 'react-intl';

import {sendEphemeralPost} from '@actions/local/post';
import ClientError from '@client/rest/error';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {AppCallResponseTypes, AppCallTypes} from '@constants/apps';
import NetworkManager from '@init/network_manager';
import {showModal} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {makeCallErrorResponse} from '@utils/apps';

import type {Client} from '@client/rest';
import type PostModel from '@typings/database/models/servers/post';

export async function doAppCall<Res=unknown>(serverUrl: string, call: AppCallRequest, type: AppCallType, intl: IntlShape, theme: Theme) {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error: makeCallErrorResponse((error as ClientError).message)};
    }

    try {
        const res = await client.executeAppCall(call, type) as AppCallResponse<Res>;
        const responseType = res.type || AppCallResponseTypes.OK;

        switch (responseType) {
            case AppCallResponseTypes.OK:
                return {data: res};
            case AppCallResponseTypes.ERROR:
                return {error: res};
            case AppCallResponseTypes.FORM: {
                if (!res.form) {
                    const errMsg = intl.formatMessage({
                        id: 'apps.error.responses.form.no_form',
                        defaultMessage: 'Response type is `form`, but no form was included in the response.',
                    });
                    return {error: makeCallErrorResponse(errMsg)};
                }

                const screen = EphemeralStore.getNavigationTopComponentId();
                if (type === AppCallTypes.SUBMIT && screen !== Screens.APP_FORM) {
                    showAppForm(res.form, call, theme);
                }

                return {data: res};
            }
            case AppCallResponseTypes.NAVIGATE:
                if (!res.navigate_to_url) {
                    const errMsg = intl.formatMessage({
                        id: 'apps.error.responses.navigate.no_url',
                        defaultMessage: 'Response type is `navigate`, but no url was included in response.',
                    });
                    return {error: makeCallErrorResponse(errMsg)};
                }

                if (type !== AppCallTypes.SUBMIT) {
                    const errMsg = intl.formatMessage({
                        id: 'apps.error.responses.navigate.no_submit',
                        defaultMessage: 'Response type is `navigate`, but the call was not a submission.',
                    });
                    return {error: makeCallErrorResponse(errMsg)};
                }

                // TODO: Add functionality to handle this
                // handleGotoLocation(res.navigate_to_url, intl);

                return {data: res};
            default: {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {
                    type: responseType,
                });
                return {error: makeCallErrorResponse(errMsg)};
            }
        }
    } catch (error) {
        const errMsg = (error as Error).message || intl.formatMessage({
            id: 'apps.error.responses.unexpected_error',
            defaultMessage: 'Received an unexpected error.',
        });
        return {error: makeCallErrorResponse(errMsg)};
    }
}

export function postEphemeralCallResponseForPost(serverUrl: string, response: AppCallResponse, message: string, post: PostModel) {
    return sendEphemeralPost(
        serverUrl,
        message,
        post.channelId,
        post.rootId,
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

export const showAppForm = async (form: AppForm, call: AppCallRequest, theme: Theme) => {
    const closeButton = await CompassIcon.getImageSource('close', 24, theme.sidebarHeaderTextColor);

    let submitButtons = [{
        id: 'submit-form',
        showAsAction: 'always',
        text: 'Submit',
    }];
    if (form.submit_buttons) {
        const options = form.fields.find((f) => f.name === form.submit_buttons)?.options;
        const newButtons = options?.map((o) => {
            return {
                id: 'submit-form_' + o.value,
                showAsAction: 'always',
                text: o.label,
            };
        });
        if (newButtons && newButtons.length > 0) {
            submitButtons = newButtons;
        }
    }
    const options = {
        topBar: {
            leftButtons: [{
                id: 'close-dialog',
                icon: closeButton,
            }],
            rightButtons: submitButtons,
        },
    };

    const passProps = {form, call};
    showModal(Screens.APP_FORM, form.title || '', passProps, options);
};
