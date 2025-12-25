// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {useNavigation} from 'expo-router';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, SafeAreaView, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';

import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import {CustomStatusDurationEnum} from '@constants/custom_status';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {observeCurrentUser} from '@queries/servers/user';
import CustomStatusStore from '@store/custom_status_store';
import {navigateBack} from '@utils/navigation/adapter';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ClearAfterMenuItem from './components/clear_after_menu_item';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

export interface CustomStatusClearAfterProps {
    currentUser?: UserModel;
    initialDuration: CustomStatusDuration;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.03),
        },
        mainView: {
            flex: 1,
            paddingTop: 32,
            paddingBottom: 32,
        },
        block: {
            borderBottomColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderBottomWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
        },
    };
});

function CustomStatusClearAfter({currentUser, initialDuration}: CustomStatusClearAfterProps) {
    const navigation = useNavigation();
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const [duration, setDuration] = useState<CustomStatusDuration>(initialDuration);
    const [expiresAt, setExpiresAt] = useState('');
    const [showExpiryTime, setShowExpiryTime] = useState(false);

    const onDone = useCallback(() => {
        CustomStatusStore.getClearAfterCallback()?.(duration, expiresAt);
        navigateBack();
    }, [duration, expiresAt]);

    const handleItemClick = useCallback((itemDuration: CustomStatusDuration, itemExpiresAt: string) => {
        setDuration(itemDuration);
        setExpiresAt(itemExpiresAt);
        setShowExpiryTime(itemDuration === 'date_and_time' && itemExpiresAt !== '');
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <Pressable
                    onPress={onDone}
                    testID='custom_status_clear_after.done.button'
                >
                    <FormattedText
                        id='mobile.custom_status.modal_confirm'
                        defaultMessage='Done'
                        style={{color: theme.sidebarHeaderTextColor, fontSize: 16}}
                    />
                </Pressable>
            ),
        });
    }, [navigation, onDone, theme.sidebarHeaderTextColor]);

    const clearAfterMenuComponent = useMemo(() => {
        const clearAfterMenu = Object.values(CustomStatusDurationEnum).map(
            (item, index, arr) => {
                if (index === arr.length - 1) {
                    return null;
                }

                return (
                    <ClearAfterMenuItem
                        currentUser={currentUser}
                        duration={item}
                        handleItemClick={handleItemClick}
                        isSelected={duration === item}
                        key={item}
                        separator={index !== arr.length - 2}
                    />
                );
            },
        );

        if (clearAfterMenu.length === 0) {
            return null;
        }

        return (
            <View testID='custom_status_clear_after.menu'>
                <View style={styles.block}>{clearAfterMenu}</View>
            </View>
        );
    }, [currentUser, duration, handleItemClick, styles.block]);

    useAndroidHardwareBackHandler(Screens.CUSTOM_STATUS_CLEAR_AFTER, navigateBack);

    return (
        <SafeAreaView
            style={styles.container}
            testID='custom_status_clear_after.screen'
        >
            <KeyboardAwareScrollView bounces={false}>
                <View style={styles.mainView}>
                    {clearAfterMenuComponent}
                </View>
                <View style={styles.block}>
                    <ClearAfterMenuItem
                        currentUser={currentUser}
                        duration={'date_and_time'}
                        expiryTime={expiresAt}
                        handleItemClick={handleItemClick}
                        isSelected={duration === 'date_and_time' && expiresAt === ''}
                        separator={false}
                        showDateTimePicker={duration === 'date_and_time'}
                        showExpiryTime={showExpiryTime}
                    />
                </View>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
}

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    currentUser: observeCurrentUser(database),
}));

export default withDatabase(enhanced(CustomStatusClearAfter));
