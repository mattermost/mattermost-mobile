// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Check if calls is enabled. If it is, then run fn; if it isn't, show an alert and set
// msgPostfix to ' (Not Available)'.
import {useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

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
