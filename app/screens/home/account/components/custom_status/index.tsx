// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DrawerItem from '@components/drawer_item';
import {useTheme} from '@context/theme';
import {showModal} from '@screens/navigation';

import type UserModel from '@typings/database/models/servers/user';
import {isMinimumServerVersion} from '@utils/helpers';
import {getUserCustomStatus, isCustomStatusExpired as checkCustomStatusIsExpired} from '@utils/user';
import React, {useState} from 'react';
import {useIntl} from 'react-intl';
import CustomLabel from './custom_label';

import CustomStatusEmoji from './custom_status_emoji';

type CustomStatusProps = {
    config: ClientConfig;
    currentUser: UserModel;
}

const CustomStatus = ({config, currentUser}: CustomStatusProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const [showStatus, setShowStatus] = useState<boolean>(true);
    const [showRetryMessage, setShowRetryMessage] = useState<boolean>(false);

    const isCustomStatusEnabled = config.EnableCustomUserStatuses === 'true' && isMinimumServerVersion(config.Version, 5, 36);
    const isCustomStatusExpirySupported = isMinimumServerVersion(config.Version, 5, 37);
    const isCustomStatusExpired = checkCustomStatusIsExpired(currentUser);
    const customStatus = getUserCustomStatus(currentUser);

    if (!isCustomStatusEnabled) {
        return null;
    }

    const isStatusSet = !isCustomStatusExpired && customStatus?.emoji && showStatus;

    const clearCustomStatus = async () => {
        setShowStatus(false);
        setShowRetryMessage(false);

        //todo: implement unsetCustomStatus
        // const {error} = await this.props.actions.unsetCustomStatus();/
        if (error) {
            setShowStatus(true);
            setShowRetryMessage(true);
        }
    };

    const goToCustomStatusScreen = () => {
        //todo: dismiss any open modal first ?
        // this.closeSettingsSidebar();
        showModal('CustomStatus', intl.formatMessage({id: 'mobile.routes.custom_status', defaultMessage: 'Set a Status'}));
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
