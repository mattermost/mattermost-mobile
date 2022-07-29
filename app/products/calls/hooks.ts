// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Check if calls is enabled. If it is, then run fn; if it isn't, show an alert and set
// msgPostfix to ' (Not Available)'.
import {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert} from 'react-native';

import {errorAlert} from '@calls/utils';
import {Client} from '@client/rest';
import ClientError from '@client/rest/error';
import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';

export const useTryCallsFunction = (fn: () => void) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [msgPostfix, setMsgPostfix] = useState('');
    const [clientError, setClientError] = useState('');

    let client: Client | undefined;
    if (!clientError) {
        try {
            client = NetworkManager.getClient(serverUrl);
        } catch (error) {
            setClientError((error as ClientError).message);
        }
    }
    const tryFn = useCallback(async () => {
        if (client && await client.getEnabled()) {
            setMsgPostfix('');
            fn();
            return;
        }

        if (clientError) {
            errorAlert(clientError, intl);
            return;
        }

        const title = intl.formatMessage({
            id: 'mobile.calls_not_available_title',
            defaultMessage: 'Calls is not enabled',
        });
        const message = intl.formatMessage({
            id: 'mobile.calls_not_available_msg',
            defaultMessage: 'Please contact your system administrator to enable the feature.',
        });
        const ok = intl.formatMessage({
            id: 'mobile.calls_ok',
            defaultMessage: 'OK',
        });
        const notAvailable = intl.formatMessage({
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
    }, [client, fn, clientError, intl]);

    return [tryFn, msgPostfix] as [() => Promise<void>, string];
};
