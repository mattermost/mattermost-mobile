// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Platform, ScrollView} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SettingItem from '../setting_item';
import SettingSeparator from '../settings_separator';

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
    };
});
const edges: Edge[] = ['left', 'right'];
type DisplayProps = {
    isTimezoneEnabled: boolean;
    isThemeSwitchingEnabled: boolean;
}
const Display = ({isTimezoneEnabled, isThemeSwitchingEnabled}: DisplayProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

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

    const goToTimezoneSettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_TIMEZONE;
        const title = intl.formatMessage({id: 'display_settings.timezone', defaultMessage: 'Timezone'});

        goToScreen(screen, title);
    });

    return (
        <SafeAreaView
            edges={edges}
            testID='notification_display.screen'
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.wrapper}
                alwaysBounceVertical={false}
            >
                <SettingSeparator/>
                {isThemeSwitchingEnabled && (
                    <SettingItem
                        optionName='theme'
                        onPress={goToThemeSettings}
                    />
                )}
                <SettingItem
                    optionName='clock'
                    onPress={goToClockDisplaySettings}
                />
                {isTimezoneEnabled && (
                    <SettingItem
                        optionName='timezone'
                        onPress={goToTimezoneSettings}
                    />
                )}
                <SettingSeparator/>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Display;
