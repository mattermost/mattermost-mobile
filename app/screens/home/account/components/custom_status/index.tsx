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
import {isCustomStatusExpirySupported as checkCustomStatusExpiry, isMinimumServerVersion} from '@utils/helpers';
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
    const [showStatus, setShowStatus] = useState<boolean>(true);
    const [showRetryMessage, setShowRetryMessage] = useState<boolean>(false);

    const isCustomStatusEnabled = config.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(config.Version, 5, 36);
    const isCustomStatusExpirySupported = checkCustomStatusExpiry(config);
    const isCustomStatusExpired = checkCustomStatusIsExpired(currentUser);
    const customStatus = getUserCustomStatus(currentUser);

    if (!isCustomStatusEnabled) {
        return null;
    }

    const isStatusSet = !isCustomStatusExpired && customStatus?.emoji && showStatus;

    const clearCustomStatus = async () => {
        setShowStatus(false);
        setShowRetryMessage(false);

        const {error} = await unsetCustomStatus(serverUrl);
        if (error) {
            setShowStatus(true);
            setShowRetryMessage(true);
        }
    };

    const goToCustomStatusScreen = () => {
        //todo: dismiss any open modal first ?
        // this.closeSettingsSidebar();
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
