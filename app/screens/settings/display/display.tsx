// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import SettingContainer from '@components/settings/container';
import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack, navigateToSettingsScreen} from '@screens/navigation';
import {getUserTimezoneProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

const CRT_FORMAT = [
    defineMessage({
        id: 'display_settings.crt.on',
        defaultMessage: 'On',
    }),
    defineMessage({
        id: 'display_settings.crt.off',
        defaultMessage: 'Off',
    }),
];

const TIME_FORMAT = [
    defineMessage({
        id: 'display_settings.clock.standard',
        defaultMessage: '12-hour',
    }),
    defineMessage({
        id: 'display_settings.clock.military',
        defaultMessage: '24-hour',
    }),
];

const TIMEZONE_FORMAT = [
    defineMessage({
        id: 'display_settings.tz.auto',
        defaultMessage: 'Auto',
    }),
    defineMessage({
        id: 'display_settings.tz.manual',
        defaultMessage: 'Manual',
    }),
];

type DisplayProps = {
    currentUser?: UserModel;
    hasMilitaryTimeFormat: boolean;
    isCRTEnabled: boolean;
    isCRTSwitchEnabled: boolean;
    isThemeSwitchingEnabled: boolean;
}

const Display = ({currentUser, hasMilitaryTimeFormat, isCRTEnabled, isCRTSwitchEnabled, isThemeSwitchingEnabled}: DisplayProps) => {
    const intl = useIntl();
    const theme = useTheme();

    // Only needs to be recalculated if the user's timezone changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const timezone = useMemo(() => getUserTimezoneProps(currentUser), [currentUser?.timezone]);

    const goToThemeSettings = usePreventDoubleTap(useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_DISPLAY_THEME);
    }, []));

    const goToClockDisplaySettings = usePreventDoubleTap(useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_DISPLAY_CLOCK);
    }, []));

    const goToTimezoneSettings = usePreventDoubleTap(useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_DISPLAY_TIMEZONE);
    }, []));

    const goToCRTSettings = usePreventDoubleTap(useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_DISPLAY_CRT);
    }, []));

    useAndroidHardwareBackHandler(Screens.SETTINGS_DISPLAY, navigateBack);

    return (
        <SettingContainer testID='display_settings'>
            {isThemeSwitchingEnabled && (
                <SettingItem
                    optionName='theme'
                    onPress={goToThemeSettings}
                    info={theme.type!}
                    testID='display_settings.theme.option'
                />
            )}
            <SettingItem
                optionName='clock'
                onPress={goToClockDisplaySettings}
                info={intl.formatMessage(hasMilitaryTimeFormat ? TIME_FORMAT[1] : TIME_FORMAT[0])}
                testID='display_settings.clock_display.option'
            />
            <SettingItem
                optionName='timezone'
                onPress={goToTimezoneSettings}
                info={intl.formatMessage(timezone.useAutomaticTimezone ? TIMEZONE_FORMAT[0] : TIMEZONE_FORMAT[1])}
                testID='display_settings.timezone.option'
            />
            {isCRTSwitchEnabled && (
                <SettingItem
                    optionName='crt'
                    onPress={goToCRTSettings}
                    info={intl.formatMessage(isCRTEnabled ? CRT_FORMAT[0] : CRT_FORMAT[1])}
                    testID='display_settings.crt.option'
                />
            )}
        </SettingContainer>
    );
};

export default Display;
