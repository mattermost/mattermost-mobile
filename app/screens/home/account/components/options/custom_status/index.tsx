// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter, TouchableOpacity, View} from 'react-native';

import {updateLocalCustomStatus} from '@actions/local/user';
import {unsetCustomStatus} from '@actions/remote/user';
import ClearButton from '@components/custom_status/clear_button';
import {Events, Screens} from '@constants';
import {SET_CUSTOM_STATUS_FAILURE} from '@constants/custom_status';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToScreen} from '@screens/navigation';
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
            alignItems: 'center',
            marginVertical: 18,
        },
        option: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
    };
});

type CustomStatusProps = {
    isTablet: boolean;
    currentUser: UserModel;
}

const CustomStatus = ({isTablet, currentUser}: CustomStatusProps) => {
    const theme = useTheme();
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

    const clearCustomStatus = usePreventDoubleTap(useCallback(async () => {
        setShowRetryMessage(false);

        const {error} = await unsetCustomStatus(serverUrl);
        if (error) {
            setShowRetryMessage(true);
            return;
        }

        // Await so observers emit before Detox asserts clear.button left the tree.
        await updateLocalCustomStatus(serverUrl, currentUser, undefined);
    }, [currentUser, serverUrl]));

    const goToCustomStatusScreen = usePreventDoubleTap(useCallback(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, Screens.CUSTOM_STATUS);
        } else {
            navigateToScreen(Screens.CUSTOM_STATUS);
        }
        setShowRetryMessage(false);
    }, [isTablet]));

    return (
        <View style={styles.body}>
            <TouchableOpacity
                onPress={goToCustomStatusScreen}
                style={styles.option}
                testID='account.custom_status.option'
            >
                <CustomStatusEmoji
                    emoji={customStatus?.emoji}
                    isStatusSet={Boolean(isStatusSet)}
                />
                <CustomLabel
                    customStatus={customStatus!}
                    hideClearButton={true}
                    isStatusSet={Boolean(isStatusSet)}
                    onClearCustomStatus={clearCustomStatus}
                    showRetryMessage={showRetryMessage}
                />
            </TouchableOpacity>
            {Boolean(isStatusSet) && (
                <ClearButton
                    handlePress={clearCustomStatus}
                    theme={theme}
                    testID='account.custom_status.clear.button'
                />
            )}
        </View>
    );
};

export default CustomStatus;
