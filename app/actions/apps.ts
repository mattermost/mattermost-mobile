// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from '@mm-redux/client';
import {ActionFunc} from '@mm-redux/types/actions';
import {AppCallResponse, AppCall, AppForm} from '@mm-redux/types/apps';
import {AppCallTypes, AppCallResponseTypes} from '@mm-redux/constants/apps';
import {sendEphemeralPost} from './views/post';
import {handleGotoLocation} from '@mm-redux/actions/integrations';
import {showModal} from './navigation';
import {Theme} from '@mm-redux/types/preferences';
import CompassIcon from '@components/compass_icon';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import EphemeralStore from '@store/ephemeral_store';

export function doAppCall<Res=unknown>(call: AppCall, intl: any): ActionFunc {
    return async (dispatch, getState) => {
        const ephemeral = (text: string) => dispatch(sendEphemeralPost(text, call?.context.channel_id, call?.context.root_id));
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
            case AppCallResponseTypes.FORM: {
                if (!res.form) {
                    const errMsg = 'An error has occurred. Please contact the App developer. Details: Response type is `form`, but no form was included in response.';

                    ephemeral(errMsg);
                    return {data: res};
                }

                const screen = EphemeralStore.getNavigationTopComponentId();
                if (call.type === AppCallTypes.SUBMIT && screen !== 'AppForm') {
                    showAppForm(res.form, call, getTheme(getState()));
                }

                return {data: res};
            }
            case AppCallResponseTypes.NAVIGATE:
                if (!res.url) {
                    const errMsg = 'An error has occurred. Please contact the App developer. Details: Response type is `navigate`, but no url was included in response.';

                    ephemeral(errMsg);
                    return {data: res};
                }
                dispatch(handleGotoLocation(res.url, intl));

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

const showAppForm = async (form: AppForm, call: AppCall, theme: Theme) => {
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

    showModal('AppForm', form.title, {form, call}, options);
};
