// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useState} from 'react';
import {Alert} from 'react-native';

import {Client4} from '@client/rest';

// Check if calls is enabled. If it is, then run fn; if it isn't, show an alert and set
// msgPostfix to ' (Not Available)'.
export const useTryCallsFunction = (fn: (channelId: string) => void) => {
    const [msgPostfix, setMsgPostfix] = useState('');

    const tryFn = async (channelId: string) => {
        if (await Client4.getEnabled()) {
            setMsgPostfix('');
            fn(channelId);
            return;
        }

        Alert.alert(
            'Calls is not enabled',
            'Please contact your system administrator to enable the feature.',
            [
                {
                    text: 'OK',
                    style: 'cancel',
                },
            ],
        );
        setMsgPostfix(' (Not Available)');
    };

    return [tryFn, msgPostfix];
};
