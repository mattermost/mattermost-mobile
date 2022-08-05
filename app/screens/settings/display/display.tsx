// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';

import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {getUserTimezoneProps} from '@utils/user';

import SettingContainer from '../setting_container';
import SettingItem from '../setting_item';

import type UserModel from '@typings/database/models/servers/user';

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
    currentUser: UserModel;
    hasMilitaryTimeFormat: boolean;
    isThemeSwitchingEnabled: boolean;
    isTimezoneEnabled: boolean;
}
const Display = ({currentUser, hasMilitaryTimeFormat, isThemeSwitchingEnabled, isTimezoneEnabled}: DisplayProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const timezone = useMemo(() => getUserTimezoneProps(currentUser), [currentUser.timezone]);

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
        <SettingContainer>
            {isThemeSwitchingEnabled && (
                <SettingItem
                    optionName='theme'
                    onPress={goToThemeSettings}
                    info={theme.type!}
                />
            )}
            <SettingItem
                optionName='clock'
                onPress={goToClockDisplaySettings}
                info={intl.formatMessage(hasMilitaryTimeFormat ? TIME_FORMAT[1] : TIME_FORMAT[0])}
            />
            {isTimezoneEnabled && (
                <SettingItem
                    optionName='timezone'
                    onPress={goToTimezoneSettings}
                    info={intl.formatMessage(timezone.useAutomaticTimezone ? TIMEZONE_FORMAT[0] : TIMEZONE_FORMAT[1])}
                />
            )}
        </SettingContainer>
    );
};

export default Display;
