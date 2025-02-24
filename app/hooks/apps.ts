// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {handleBindingClick} from '@actions/remote/apps';
import {handleGotoLocation} from '@actions/remote/command';
import {AppCallResponseTypes} from '@constants/apps';
import {useServerUrl} from '@context/server';
import {showAppForm} from '@screens/navigation';
import {createCallContext} from '@utils/apps';

export type UseAppBindingContext = {
    channel_id: string;
    team_id: string;
    post_id?: string;
    root_id?: string;
}

export type UseAppBindingConfig = {
    onSuccess: (callResponse: AppCallResponse, message: string) => void;
    onError: (callResponse: AppCallResponse, message: string) => void;
    onForm?: (form: AppForm) => void;
    onNavigate?: (callResp: AppCallResponse) => void;
}

export const useAppBinding = (context: UseAppBindingContext, config: UseAppBindingConfig) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();

    return useCallback(async (binding: AppBinding) => {
        const callContext = createCallContext(
            binding.app_id!,
            binding.location,
            context.channel_id,
            context.team_id,
            context.post_id,
            context.root_id,
        );

        const res = await handleBindingClick(serverUrl, binding, callContext, intl);

        return async () => {
            if (res.error) {
                const errorResponse = res.error;
                const errorMessage = errorResponse.text || intl.formatMessage({
                    id: 'apps.error.unknown',
                    defaultMessage: 'Unknown error occurred.',
                });

                config.onError(errorResponse, errorMessage);
                return;
            }

            const callResp = res.data!;
            switch (callResp.type) {
                case AppCallResponseTypes.OK:
                    if (callResp.text) {
                        config.onSuccess(callResp, callResp.text);
                    }
                    return;
                case AppCallResponseTypes.NAVIGATE:
                    if (callResp.navigate_to_url) {
                        if (config.onNavigate) {
                            config.onNavigate(callResp);
                        } else {
                            await handleGotoLocation(serverUrl, intl, callResp.navigate_to_url);
                        }
                    }
                    return;
                case AppCallResponseTypes.FORM:
                    if (callResp.form) {
                        if (config.onForm) {
                            config.onForm(callResp.form);
                        } else {
                            await showAppForm(callResp.form, callContext);
                        }
                    }
                    return;
                default: {
                    const errorMessage = intl.formatMessage({
                        id: 'apps.error.responses.unknown_type',
                        defaultMessage: 'App response type not supported. Response type: {type}.',
                    }, {
                        type: callResp.type,
                    });

                    config.onError(callResp, errorMessage);
                }
            }
        };
    }, [context, config, serverUrl, intl]);
};
