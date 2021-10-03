// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import {useIntl} from 'react-intl';

import {unsetCustomStatus} from '@actions/remote/user';
import DrawerItem from '@components/drawer_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {showModal} from '@screens/navigation';
import {isCustomStatusExpirySupported as checkCustomStatusExpiry, isMinimumServerVersion, safeParseJSON} from '@utils/helpers';
import {getUserCustomStatus, isCustomStatusExpired as checkCustomStatusIsExpired, updateUserCustomStatus} from '@utils/user';

import CustomLabel from './custom_label';
import CustomStatusEmoji from './custom_status_emoji';

import type {Database} from '@nozbe/watermelondb';
import type UserModel from '@typings/database/models/servers/user';

type CustomStatusProps = {
    config: ClientConfig;
    currentUser: UserModel;
    database: Database;
}

const CustomStatus = ({config, currentUser, database}: CustomStatusProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const customStatus = safeParseJSON(getUserCustomStatus(currentUser) as string) as UserCustomStatus;
    const hasCST = customStatus && Object.keys(customStatus!).length > 0;
    const [showStatus, setShowStatus] = useState<boolean>(hasCST ?? false);
    const [showRetryMessage, setShowRetryMessage] = useState<boolean>(false);

    const isCustomStatusEnabled = config.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(config.Version, 5, 36);
    const isCustomStatusExpirySupported = checkCustomStatusExpiry(config);
    const isCustomStatusExpired = checkCustomStatusIsExpired(currentUser);

    if (!isCustomStatusEnabled) {
        return null;
    }

    const isStatusSet = !isCustomStatusExpired && customStatus?.emoji && showStatus;

    const clearCustomStatus = async () => {
        setShowStatus(false);
        setShowRetryMessage(false);

        const {data, error} = await unsetCustomStatus(serverUrl);
        if (error) {
            setShowStatus(true);
            setShowRetryMessage(true);
        }
        if (data) {
            await updateUserCustomStatus(null, currentUser, database);
        }
    };

    const goToCustomStatusScreen = () => {
        showModal(Screens.CUSTOM_STATUS, intl.formatMessage({id: 'mobile.routes.custom_status', defaultMessage: 'Set a Status'}));
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
                    customStatus={customStatus}
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
