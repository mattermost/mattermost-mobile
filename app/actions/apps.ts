// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {sendEphemeralPost} from '@actions/views/post';
import {Client4} from '@client/rest';
import {AppCallResponseTypes} from '@mm-redux/constants/apps';
import {ActionFunc, DispatchFunc} from '@mm-redux/types/actions';
import {AppCallResponse, AppCallRequest, AppContext, AppBinding} from '@mm-redux/types/apps';
import {CommandArgs} from '@mm-redux/types/integrations';
import {Post} from '@mm-redux/types/posts';
import {cleanForm, createCallRequest, makeCallErrorResponse} from '@utils/apps';

export function handleBindingClick<Res=unknown>(binding: AppBinding, context: AppContext, intl: any): ActionFunc {
    return async (dispatch: DispatchFunc) => {
        // Fetch form
        if (binding.form?.source) {
            const callRequest = createCallRequest(
                binding.form.source,
                context,
            );

            const res = await dispatch(doAppFetchForm<Res>(callRequest, intl));
            return res;
        }

        // Open form
        if (binding.form) {
            // This should come properly formed, but using preventive checks
            if (!binding.form?.submit) {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.malformed_binding',
                    defaultMessage: 'This binding is not properly formed. Contact the App developer.',
                });
                return {error: makeCallErrorResponse(errMsg)};
            }

            const res: AppCallResponse = {
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
            return {error: makeCallErrorResponse(errMsg)};
        }

        const callRequest = createCallRequest(
            binding.submit,
            context,
        );

        const res = await dispatch(doAppSubmit<Res>(callRequest, intl));
        return res;
    };
}

export function doAppSubmit<Res=unknown>(inCall: AppCallRequest, intl: any): ActionFunc {
    return async () => {
        try {
            const call: AppCallRequest = {
                ...inCall,
                context: {
                    ...inCall.context,
                    track_as_submit: true,
                },
            };
            const res = await Client4.executeAppCall(call, true) as AppCallResponse<Res>;
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
                    return {error: makeCallErrorResponse(errMsg)};
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
                    return {error: makeCallErrorResponse(errMsg)};
                }

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
            const errMsg = error.message || intl.formatMessage({
                id: 'apps.error.responses.unexpected_error',
                defaultMessage: 'Received an unexpected error.',
            });
            return {error: makeCallErrorResponse(errMsg)};
        }
    };
}

export function doAppFetchForm<Res=unknown>(call: AppCallRequest, intl: any): ActionFunc {
    return async () => {
        try {
            const res = await Client4.executeAppCall(call, false) as AppCallResponse<Res>;
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
                    return {error: makeCallErrorResponse(errMsg)};
                }
                cleanForm(res.form);
                return {data: res};
            default: {
                const errMsg = intl.formatMessage({
                    id: 'apps.error.responses.unknown_type',
                    defaultMessage: 'App response type not supported. Response type: {type}.',
                }, {type: responseType});
                return {error: makeCallErrorResponse(errMsg)};
            }
            }
        } catch (error: any) {
            const errMsg = error.message || intl.formatMessage({
                id: 'apps.error.responses.unexpected_error',
                defaultMessage: 'Received an unexpected error.',
            });
            return {error: makeCallErrorResponse(errMsg)};
        }
    };
}

export function doAppLookup<Res=unknown>(call: AppCallRequest, intl: any): ActionFunc {
    return async () => {
        try {
            const res = await Client4.executeAppCall(call, false) as AppCallResponse<Res>;
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
                return {error: makeCallErrorResponse(errMsg)};
            }
            }
        } catch (error: any) {
            const errMsg = error.message || intl.formatMessage({
                id: 'apps.error.responses.unexpected_error',
                defaultMessage: 'Received an unexpected error.',
            });
            return {error: makeCallErrorResponse(errMsg)};
        }
    };
}

export function postEphemeralCallResponseForPost(response: AppCallResponse, message: string, post: Post): ActionFunc {
    return (dispatch: DispatchFunc) => {
        return dispatch(sendEphemeralPost(
            message,
            post.channel_id,
            post.root_id || post.id,
            response.app_metadata?.bot_user_id,
        ));
    };
}

export function postEphemeralCallResponseForChannel(response: AppCallResponse, message: string, channelID: string): ActionFunc {
    return (dispatch: DispatchFunc) => {
        return dispatch(sendEphemeralPost(
            message,
            channelID,
            '',
            response.app_metadata?.bot_user_id,
        ));
    };
}

export function postEphemeralCallResponseForContext(response: AppCallResponse, message: string, context: AppContext): ActionFunc {
    return (dispatch: DispatchFunc) => {
        return dispatch(sendEphemeralPost(
            message,
            context.channel_id,
            context.root_id || context.post_id,
            response.app_metadata?.bot_user_id,
        ));
    };
}

export function postEphemeralCallResponseForCommandArgs(response: AppCallResponse, message: string, args: CommandArgs): ActionFunc {
    return (dispatch: DispatchFunc) => {
        return dispatch(sendEphemeralPost(
            message,
            args.channel_id,
            args.root_id,
            response.app_metadata?.bot_user_id,
        ));
    };
}
