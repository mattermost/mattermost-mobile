// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {updateMe} from '@actions/remote/user';
import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {goToScreen, popTopScreen, setButtons} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getDeviceTimezone} from '@utils/timezone';
import {getTimezoneRegion, getUserTimezoneProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            flex: 1,
            paddingTop: 35,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            marginLeft: 15,
        },
        content: {
            paddingHorizontal: 8,
        },
    };
});

const edges: Edge[] = ['left', 'right'];
const SAVE_TIMEZONE_BUTTON_ID = 'save_timezone';

type DisplayTimezoneProps = {
    currentUser: UserModel;
    componentId: string;
}
const DisplayTimezone = ({currentUser, componentId}: DisplayTimezoneProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const timezone = useMemo(() => getUserTimezoneProps(currentUser), [currentUser.timezone]);
    const [userTimezone, setUserTimezone] = useState(timezone);
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const updateAutomaticTimezone = (useAutomaticTimezone: boolean) => {
        const automaticTimezone = getDeviceTimezone();
        setUserTimezone((prev) => ({
            ...prev,
            useAutomaticTimezone,
            automaticTimezone,
        }));
    };

    const updateManualTimezone = (mtz: string) => {
        setUserTimezone({
            useAutomaticTimezone: false,
            automaticTimezone: '',
            manualTimezone: mtz,
        });
    };

    const goToSelectTimezone = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_TIMEZONE_SELECT;
        const title = intl.formatMessage({id: 'settings_display.timezone.select', defaultMessage: 'Select Timezone'});
        const passProps = {
            selectedTimezone: timezone.manualTimezone,
            onBack: updateManualTimezone,
        };

        goToScreen(screen, title, passProps);
    });

    const close = () => popTopScreen(componentId);

    const saveTimezone = useCallback(() => {
        const timeZone = {
            useAutomaticTimezone: userTimezone.useAutomaticTimezone.toString(),
            automaticTimezone: userTimezone.automaticTimezone,
            manualTimezone: userTimezone.manualTimezone,
        };

        updateMe(serverUrl, {timezone: timeZone});
        close();
    }, [userTimezone, currentUser.timezone, serverUrl]);

    const saveButton = useMemo(() => {
        return {
            id: SAVE_TIMEZONE_BUTTON_ID,
            enabled: false,
            showAsAction: 'always' as const,
            testID: 'notification_settings.auto_res.save.button',
            color: theme.sidebarHeaderTextColor,
            text: intl.formatMessage({id: 'settings.save', defaultMessage: 'Save'}),
        };
    }, [theme.sidebarHeaderTextColor]);

    useEffect(() => {
        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled: timezone.useAutomaticTimezone !== userTimezone.useAutomaticTimezone,
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, currentUser.timezone]);

    useNavButtonPressed(SAVE_TIMEZONE_BUTTON_ID, componentId, saveTimezone, [saveTimezone]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
        >
            <View style={styles.wrapper}>
                <View style={styles.divider}/>
                <OptionItem
                    action={updateAutomaticTimezone}
                    containerStyle={styles.content}
                    description={getTimezoneRegion(userTimezone.automaticTimezone)}
                    label={intl.formatMessage({id: 'settings_display.timezone.automatically', defaultMessage: 'Set automatically'})}
                    selected={userTimezone.useAutomaticTimezone}
                    type='toggle'
                />
                {!userTimezone.useAutomaticTimezone && (
                    <View>
                        <View style={styles.separator}/>
                        <OptionItem
                            action={goToSelectTimezone}
                            containerStyle={styles.content}
                            description={getTimezoneRegion(userTimezone.manualTimezone)}
                            label={intl.formatMessage({id: 'settings_display.timezone.manual', defaultMessage: 'Change timezone'})}
                            type='arrow'
                        />
                    </View>
                )}
                <View style={styles.divider}/>
            </View>
        </SafeAreaView>
    );
};

export default DisplayTimezone;
