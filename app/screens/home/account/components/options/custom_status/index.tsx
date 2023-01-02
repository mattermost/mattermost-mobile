// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, TouchableOpacity, View} from 'react-native';

import {updateLocalCustomStatus} from '@actions/local/user';
import {unsetCustomStatus} from '@actions/remote/user';
import {Events, Screens} from '@constants';
import {SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {showModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserCustomStatus, isCustomStatusExpired as checkCustomStatusIsExpired} from '@utils/user';

import CustomLabel from './custom_label';
import CustomStatusEmoji from './custom_status_emoji';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        body: {
            flexDirection: 'row',
            marginVertical: 18,
        },
    };
});

type CustomStatusProps = {
    isTablet: boolean;
    currentUser: UserModel;
}

const CustomStatus = ({isTablet, currentUser}: CustomStatusProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [showRetryMessage, setShowRetryMessage] = useState<boolean>(false);
    const customStatus = getUserCustomStatus(currentUser);
    const isCustomStatusExpired = checkCustomStatusIsExpired(currentUser);
    const isStatusSet = !isCustomStatusExpired && (customStatus?.text || customStatus?.emoji);
    const styles = getStyleSheet(theme);

    useEffect(() => {
        const onSetCustomStatusError = () => {
            setShowRetryMessage(true);
        };

        const listener = DeviceEventEmitter.addListener(SET_CUSTOM_STATUS_FAILURE, onSetCustomStatusError);

        return () => listener.remove();
    }, []);

    const clearCustomStatus = useCallback(preventDoubleTap(async () => {
        setShowRetryMessage(false);

        const {error} = await unsetCustomStatus(serverUrl);
        if (error) {
            setShowRetryMessage(true);
            return;
        }

        updateLocalCustomStatus(serverUrl, currentUser, undefined);
    }), []);

    const goToCustomStatusScreen = useCallback(preventDoubleTap(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, Screens.CUSTOM_STATUS);
        } else {
            showModal(Screens.CUSTOM_STATUS, intl.formatMessage({id: 'mobile.routes.custom_status', defaultMessage: 'Set a custom status'}));
        }
        setShowRetryMessage(false);
    }), [isTablet]);

    return (
        <TouchableOpacity
            onPress={goToCustomStatusScreen}
            testID='account.custom_status.option'
        >
            <View style={styles.body}>
                <CustomStatusEmoji
                    emoji={customStatus?.emoji}
                    isStatusSet={Boolean(isStatusSet)}
                />
                <CustomLabel
                    customStatus={customStatus!}
                    isStatusSet={Boolean(isStatusSet)}
                    onClearCustomStatus={clearCustomStatus}
                    showRetryMessage={showRetryMessage}
                />
            </View>
        </TouchableOpacity>
    );
};

export default CustomStatus;
