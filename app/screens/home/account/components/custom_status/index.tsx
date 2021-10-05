// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter} from 'react-native';

import {updateLocalCustomStatus} from '@actions/local/user';
import {unsetCustomStatus} from '@actions/remote/user';
import DrawerItem from '@components/drawer_item';
import {Screens} from '@constants';
import {SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {showModal} from '@screens/navigation';
import {isCustomStatusExpirySupported as checkCustomStatusExpiry, isMinimumServerVersion, safeParseJSON} from '@utils/helpers';
import {getUserCustomStatus, isCustomStatusExpired as checkCustomStatusIsExpired} from '@utils/user';

import CustomLabel from './custom_label';
import CustomStatusEmoji from './custom_status_emoji';

import type UserModel from '@typings/database/models/servers/user';

type CustomStatusProps = {
    config: ClientConfig;
    currentUser: UserModel;
}

const CustomStatus = ({config, currentUser}: CustomStatusProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [showRetryMessage, setShowRetryMessage] = useState<boolean>(false);

    const customStatus = safeParseJSON(getUserCustomStatus(currentUser) as string) as UserCustomStatus;

    const isCustomStatusEnabled = config.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(config.Version, 5, 36);
    const isCustomStatusExpirySupported = checkCustomStatusExpiry(config);
    const isCustomStatusExpired = checkCustomStatusIsExpired(currentUser);

    useEffect(() => {
        const onSetCustomStatusError = () => {
            setShowRetryMessage(true);
        };

        const listener = DeviceEventEmitter.addListener(SET_CUSTOM_STATUS_FAILURE, onSetCustomStatusError);

        return () => listener.remove();
    }, []);

    if (!isCustomStatusEnabled) {
        return null;
    }

    const isStatusSet = !isCustomStatusExpired && (customStatus?.text || customStatus?.emoji);

    const clearCustomStatus = async () => {
        setShowRetryMessage(false);

        const {data, error} = await unsetCustomStatus(serverUrl);
        if (error) {
            setShowRetryMessage(true);
        }
        if (data) {
            await updateLocalCustomStatus({
                serverUrl,
                status: undefined,
                user: currentUser,
            });
        }
    };

    const goToCustomStatusScreen = () => {
        showModal(Screens.CUSTOM_STATUS, intl.formatMessage({id: 'mobile.routes.custom_status', defaultMessage: 'Set a Status'}));
        setShowRetryMessage(false);
    };

    return (
        <DrawerItem
            testID='settings.sidebar.custom_status.action'
            labelComponent={
                <CustomLabel
                    currentUser={currentUser}
                    theme={theme}
                    customStatus={customStatus!}
                    isCustomStatusExpirySupported={isCustomStatusExpirySupported}
                    isStatusSet={Boolean(isStatusSet)}
                    onClearCustomStatus={clearCustomStatus}
                    showRetryMessage={showRetryMessage}
                />
            }
            leftComponent={
                <CustomStatusEmoji
                    emoji={customStatus?.emoji}
                    isStatusSet={Boolean(isStatusSet)}
                    theme={theme}
                />}
            separator={false}
            onPress={goToCustomStatusScreen}
            theme={theme}
        />
    );
};

export default CustomStatus;
