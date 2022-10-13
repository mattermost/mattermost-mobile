// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {Alert} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';

import {Client4} from '@client/rest';
import {General} from '@mm-redux/constants';
import {getCurrentChannel} from '@mm-redux/selectors/entities/channels';
import {getCurrentUserRoles} from '@mm-redux/selectors/entities/users';
import {isAdmin as checkIsAdmin, isChannelAdmin as checkIsChannelAdmin} from '@mm-redux/utils/user_utils';
import {loadConfig} from '@mmproducts/calls/store/actions/calls';
import {
    getConfig,
    isCallsExplicitlyDisabled,
    isCallsExplicitlyEnabled,
    isCallsPluginEnabled,
} from '@mmproducts/calls/store/selectors/calls';

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
    const dispatch = useDispatch();
    const config = useSelector(getConfig);
    const currentChannel = useSelector(getCurrentChannel);
    const pluginEnabled = useSelector(isCallsPluginEnabled);
    const explicitlyDisabled = useSelector(isCallsExplicitlyDisabled);
    const explicitlyEnabled = useSelector(isCallsExplicitlyEnabled);
    const roles = useSelector(getCurrentUserRoles);

    useEffect(() => {
        if (pluginEnabled) {
            // @ts-expect-error ActionFunc
            dispatch(loadConfig());
        }
    }, []);

    const isDirectMessage = currentChannel.type === General.DM_CHANNEL;
    const isGroupMessage = currentChannel.type === General.GM_CHANNEL;
    const isAdmin = checkIsAdmin(roles);
    const isChannelAdmin = isAdmin || checkIsChannelAdmin(roles);

    const enabled = pluginEnabled && (explicitlyEnabled || (!explicitlyDisabled && config.DefaultEnabled));
    let canEnableDisable;
    if (!pluginEnabled) {
        canEnableDisable = false;
    } else if (config.AllowEnableCalls) {
        canEnableDisable = isDirectMessage || isGroupMessage || isChannelAdmin;
    } else {
        canEnableDisable = isAdmin;
    }

    return [enabled, canEnableDisable];
};
