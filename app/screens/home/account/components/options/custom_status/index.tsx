// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter, Pressable, View} from 'react-native';

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
        row: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        pressableBody: {
            flex: 1,
            flexDirection: 'row',
            marginVertical: 18,
        },
        label: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
            textAlignVertical: 'center',
            includeFontPadding: false,
        },
        clearButton: {
            marginRight: 14,
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
    const isStatusSet = Boolean(!isCustomStatusExpired && (customStatus?.text || customStatus?.emoji));
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

        const {error: localError} = await updateLocalCustomStatus(serverUrl, currentUser, undefined);
        if (localError) {
            setShowRetryMessage(true);
        }
    }, [currentUser, serverUrl]));

    const goToCustomStatusScreen = usePreventDoubleTap(useCallback(() => {
        if (isTablet) {
            DeviceEventEmitter.emit(Events.ACCOUNT_SELECT_TABLET_VIEW, Screens.CUSTOM_STATUS);
        } else {
            navigateToScreen(Screens.CUSTOM_STATUS);
        }
        setShowRetryMessage(false);
    }, [isTablet]));

    // Clear is a sibling of the row press target — nested touchables on Android
    // steal/miss the clear tap (CI 30250131265 MM-T4990_4 / MM-T3891).
    return (
        <View style={styles.row}>
            <Pressable
                onPress={goToCustomStatusScreen}
                testID='account.custom_status.option'
                style={({pressed}) => [styles.pressableBody, pressed && {opacity: 0.72}]}
            >
                <CustomStatusEmoji
                    emoji={customStatus?.emoji}
                    isStatusSet={Boolean(isStatusSet)}
                />
                <CustomLabel
                    customStatus={customStatus!}
                    isStatusSet={Boolean(isStatusSet)}
                    showRetryMessage={showRetryMessage}
                />
            </Pressable>
            {Boolean(isStatusSet) && (
                <View style={styles.clearButton}>
                    <ClearButton
                        handlePress={clearCustomStatus}
                        theme={theme}
                        testID='account.custom_status.clear.button'
                    />
                </View>
            )}
        </View>
    );
};

export default CustomStatus;
