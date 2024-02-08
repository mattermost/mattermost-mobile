// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import SettingContainer from '@components/settings/container';
import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {t} from '@i18n';
import {goToScreen, popTopScreen} from '@screens/navigation';
import {gotoSettingsScreen} from '@screens/settings/config';
import {preventDoubleTap} from '@utils/tap';
import {getUserTimezoneProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const CRT_FORMAT = [
    {
        id: t('display_settings.crt.on'),
        defaultMessage: 'On',
    },
    {
        id: t('display_settings.crt.off'),
        defaultMessage: 'Off',
    },
];

const TIME_FORMAT = [
    {
        id: t('display_settings.clock.standard'),
        defaultMessage: '12-hour',
    },
    {
        id: t('display_settings.clock.military'),
        defaultMessage: '24-hour',
    },
];

const TIMEZONE_FORMAT = [
    {
        id: t('display_settings.tz.auto'),
        defaultMessage: 'Auto',
    },
    {
        id: t('display_settings.tz.manual'),
        defaultMessage: 'Manual',
    },
];

type DisplayProps = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
    hasMilitaryTimeFormat: boolean;
    isCRTEnabled: boolean;
    isCRTSwitchEnabled: boolean;
    isThemeSwitchingEnabled: boolean;
}

const Display = ({componentId, currentUser, hasMilitaryTimeFormat, isCRTEnabled, isCRTSwitchEnabled, isThemeSwitchingEnabled}: DisplayProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const timezone = useMemo(() => getUserTimezoneProps(currentUser), [currentUser?.timezone]);

    const goToThemeSettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_THEME;
        const title = intl.formatMessage({id: 'display_settings.theme', defaultMessage: 'Theme'});
        goToScreen(screen, title);
    });

    const goToClockDisplaySettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_CLOCK;
        const title = intl.formatMessage({id: 'display_settings.clockDisplay', defaultMessage: 'Clock Display'});
        gotoSettingsScreen(screen, title);
    });

    const goToTimezoneSettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_TIMEZONE;
        const title = intl.formatMessage({id: 'display_settings.timezone', defaultMessage: 'Timezone'});
        gotoSettingsScreen(screen, title);
    });

    const goToCRTSettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY_CRT;
        const title = intl.formatMessage({id: 'display_settings.crt', defaultMessage: 'Collapsed Reply Threads'});
        gotoSettingsScreen(screen, title);
    });

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

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
