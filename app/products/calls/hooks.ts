// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useSelector} from 'react-redux';

import {Client4} from '@client/rest';
import {General} from '@mm-redux/constants';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {isAdmin, isChannelAdmin as checkIsChannelAdmin} from '@mm-redux/utils/user_utils';
import {isCallsDisabled, isCallsEnabled} from '@mmproducts/calls/store/selectors/calls';
import {DefaultServerConfig} from '@mmproducts/calls/store/types/calls';

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

export const useCallsChannelSettings = () => {
    const currentChannel = useSelector(getCurrentChannel);
    const explicitlyDisabled = useSelector(isCallsDisabled);
    const explicitlyEnabled = useSelector(isCallsEnabled);
    const roles = useSelector(getCurrentUserRoles);
    const [config, setConfig] = useState(DefaultServerConfig);

    useEffect(() => {
        async function getConfig() {
            const resp = await Client4.getCallsConfig();
            setConfig(resp);
        }

        getConfig();
    }, []);

    const isDirectMessage = currentChannel.type === General.DM_CHANNEL;
    const isGroupMessage = currentChannel.type === General.GM_CHANNEL;
    const admin = isAdmin(roles);
    const isChannelAdmin = admin || checkIsChannelAdmin(roles);

    const enabled = (explicitlyEnabled || (!explicitlyDisabled && config.DefaultEnabled));
    let canEnableDisable;
    if (config.AllowEnableCalls) {
        canEnableDisable = isDirectMessage || isGroupMessage || isChannelAdmin;
    } else {
        canEnableDisable = admin;
    }

    return [enabled, canEnableDisable];
};
