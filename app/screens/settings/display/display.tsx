// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import SettingOption from '@screens/settings/setting_option';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            ...Platform.select({
                ios: {
                    flex: 1,
                    paddingTop: 35,
                },
            }),
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
            width: '100%',
        },
    };
});

type DisplayProps = {
    isTimezoneEnabled: boolean;
    isThemeSwitchingEnabled: boolean;
}
const Display = ({isTimezoneEnabled, isThemeSwitchingEnabled}: DisplayProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();
    const onPressHandler = () => {
        return Alert.alert(
            'The functionality you are trying to use has not yet been implemented.',
        );
    };

    const goToThemeSettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_THEME;
        const title = intl.formatMessage({id: 'display_settings.theme', defaultMessage: 'Theme'});

        goToScreen(screen, title);
    });

    const goToClockDisplaySettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_CLOCK;
        const title = intl.formatMessage({id: 'display_settings.clockDisplay', defaultMessage: 'Clock Display'});
        goToScreen(screen, title);
    });

    return (
        <SafeAreaView
            edges={['left', 'right']}
            testID='notification_display.screen'
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.wrapper}
                alwaysBounceVertical={false}
            >
                <View style={styles.divider}/>
                {isThemeSwitchingEnabled && (
                    <SettingOption
                        optionName='theme'
                        onPress={goToThemeSettings}
                    />
                )}
                <SettingOption
                    optionName='clock'
                    onPress={goToClockDisplaySettings}
                />
                {isTimezoneEnabled && (
                    <SettingOption
                        optionName='timezone'
                        onPress={onPressHandler}
                    />
                )}
                <View style={styles.divider}/>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Display;
