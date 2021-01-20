// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import {ActionFunc} from '@mm-redux/types/actions';
import {AppCallResponse, AppCall} from '@mm-redux/types/apps';
import {AppsBindings, AppCallTypes, AppCallResponseTypes} from '@mm-redux/constants/apps';
import {sendEphemeralPost} from './views/post';

export function doAppCall<Res=unknown>(call: AppCall): ActionFunc {
    return async (dispatch) => {
        const ephemeral = (text: string) => dispatch(sendEphemeralPost(text, (call && call.context.channel_id) || '', (call && call.context.root_id) || ''));
        try {
            const res = await Client4.executeAppCall(call) as AppCallResponse<Res>;
            const responseType = res.type || AppCallResponseTypes.OK;

            switch (responseType) {
            case AppCallResponseTypes.OK:
                if (res.markdown) {
                    if (!call.context.channel_id) {
                        return {data: res};
                    }

                    ephemeral(res.markdown);
                }
                return {data: res};
            case AppCallResponseTypes.ERROR:
                return {data: res};
            case AppCallResponseTypes.FORM:
                if (!res.form) {
                    const errMsg = 'An error has occurred. Please contact the App developer. Details: Response type is `form`, but no form was included in response.';

                    ephemeral(errMsg);
                    return {data: res};
                }

                if (call.context.location === AppsBindings.COMMAND && call.type === AppCallTypes.FORM) {
                    return {data: res};
                }

                // TODO Open new interactive dialog
                //dispatch(openAppsModal(res.form, call));
                return {data: res};
            }

            return {data: res};
        } catch (err) {
            const msg = err.message || 'We found an unexpected error.';
            ephemeral(msg);
            return {
                type: AppCallResponseTypes.ERROR,
                error: msg,
            };
        }
    };
}
