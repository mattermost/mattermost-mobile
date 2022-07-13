// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {Screens} from '@constants';
import {goToScreen} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

import SettingContainer from '../setting_container';
import SettingItem from '../setting_item';

type DisplayProps = {
    isTimezoneEnabled: boolean;
    isThemeSwitchingEnabled: boolean;
}
const Display = ({isTimezoneEnabled, isThemeSwitchingEnabled}: DisplayProps) => {
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
        <SettingContainer>
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
        </SettingContainer>
    );
};

export default Display;
