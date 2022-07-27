// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Check if calls is enabled. If it is, then run fn; if it isn't, show an alert and set
// msgPostfix to ' (Not Available)'.
import {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {loadConfig} from '@calls/actions';
import {useCallsConfig} from '@calls/state/calls_config';
import {useCallsState} from '@calls/state/calls_state';
import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';

export const useTryCallsFunction = (fn: () => void) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const client = NetworkManager.getClient(serverUrl);
    const [msgPostfix, setMsgPostfix] = useState('');

    const tryFn = async () => {
        if (await client.getEnabled()) {
            setMsgPostfix('');
            fn();
            return;
        }

        const title = formatMessage({
            id: 'mobile.calls_not_available_title',
            defaultMessage: 'Calls is not enabled',
        });
        const message = formatMessage({
            id: 'mobile.calls_not_available_msg',
            defaultMessage: 'Please contact your system administrator to enable the feature.',
        });
        const ok = formatMessage({
            id: 'mobile.calls_ok',
            defaultMessage: 'OK',
        });
        const notAvailable = formatMessage({
            id: 'mobile.calls_not_available_option',
            defaultMessage: '(Not Available)',
        });

        Alert.alert(
            title,
            message,
            [
                {
                    text: ok,
                    style: 'cancel',
                },
            ],
        );
        setMsgPostfix(` ${notAvailable}`);
    };

    return [tryFn, msgPostfix] as [() => Promise<void>, string];
};

export const useCallsEnabled = (channelId: string) => {
    const serverUrl = useServerUrl();
    const callsConfig = useCallsConfig(serverUrl);

    // Periodically check if the calls config has been changed.
    useEffect(() => {
        if (callsConfig.pluginEnabled) {
            loadConfig(serverUrl);
        }
    }, []);

    const callsState = useCallsState(serverUrl);
    const explicitlyEnabled = callsState.enabled.hasOwnProperty(channelId) && callsState.enabled[channelId];
    const explicitlyDisabled = callsState.enabled.hasOwnProperty(channelId) && !callsState.enabled[channelId];
    return explicitlyEnabled || (!explicitlyDisabled && callsConfig.DefaultEnabled);
};
