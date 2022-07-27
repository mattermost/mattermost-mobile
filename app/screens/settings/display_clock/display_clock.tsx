// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {savePreference} from '@actions/remote/preference';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {popTopScreen, setButtons} from '@screens/navigation';

import {getSaveButton} from '../config';
import SettingBlock from '../setting_block';
import SettingContainer from '../setting_container';
import SettingOption from '../setting_option';
import SettingSeparator from '../settings_separator';

const CLOCK_TYPE = {
    NORMAL: 'NORMAL',
    MILITARY: 'MILITARY',
} as const;

const SAVE_CLOCK_BUTTON_ID = 'settings_display.clock.save.button';

type DisplayClockProps = {
    componentId: string;
    currentUserId: string;
    hasMilitaryTimeFormat: boolean;
}
const DisplayClock = ({componentId, currentUserId, hasMilitaryTimeFormat}: DisplayClockProps) => {
    const theme = useTheme();
    const [isMilitaryTimeFormat, setIsMilitaryTimeFormat] = useState(hasMilitaryTimeFormat);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const saveButton = useMemo(() => getSaveButton(SAVE_CLOCK_BUTTON_ID, intl, theme.sidebarHeaderTextColor), [theme.sidebarHeaderTextColor]);

    const onSelectClockPreference = useCallback((clockType: keyof typeof CLOCK_TYPE) => {
        setIsMilitaryTimeFormat(clockType === CLOCK_TYPE.MILITARY);
    }, []);

    const close = () => popTopScreen(componentId);

    const saveClockDisplayPreference = () => {
        const timePreference: PreferenceType = {
            category: Preferences.CATEGORY_DISPLAY_SETTINGS,
            name: 'use_military_time',
            user_id: currentUserId,
            value: `${isMilitaryTimeFormat}`,
        };

        savePreference(serverUrl, [timePreference]);
        close();
    };

    useEffect(() => {
        const buttons = {
            rightButtons: [{
                ...saveButton,
                enabled: hasMilitaryTimeFormat !== isMilitaryTimeFormat,
            }],
        };
        setButtons(componentId, buttons);
    }, [componentId, saveButton, isMilitaryTimeFormat]);

    useAndroidHardwareBackHandler(componentId, close);
    useNavButtonPressed(SAVE_CLOCK_BUTTON_ID, componentId, saveClockDisplayPreference, [isMilitaryTimeFormat]);

    return (
        <SettingContainer>
            <SettingBlock
                disableHeader={true}
            >
                <SettingOption
                    action={onSelectClockPreference}
                    label={intl.formatMessage({id: 'settings_display.clock.standard', defaultMessage: '12-hour clock'})}
                    description={intl.formatMessage({id: 'settings_display.clock.normal.desc', defaultMessage: 'Example: 4:00 PM'})}
                    selected={!isMilitaryTimeFormat}
                    testID='clock_display_settings.normal_clock.action'
                    type='select'
                    value={CLOCK_TYPE.NORMAL}
                />
                <SettingSeparator/>
                <SettingOption
                    action={onSelectClockPreference}
                    label={intl.formatMessage({id: 'settings_display.clock.mz', defaultMessage: '24-hour clock'})}
                    description={intl.formatMessage({id: 'settings_display.clock.mz.desc', defaultMessage: 'Example: 16:00'})}
                    selected={isMilitaryTimeFormat}
                    testID='clock_display_settings.military_clock.action'
                    type='select'
                    value={CLOCK_TYPE.MILITARY}
                />
                <SettingSeparator/>
            </SettingBlock>
        </SettingContainer>
    );
};

export default DisplayClock;
