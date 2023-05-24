// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {savePreference} from '@actions/remote/preference';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {popTopScreen} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

const CLOCK_TYPE = {
    NORMAL: 'NORMAL',
    MILITARY: 'MILITARY',
} as const;

type DisplayClockProps = {
    componentId: AvailableScreens;
    currentUserId: string;
    hasMilitaryTimeFormat: boolean;
}
const DisplayClock = ({componentId, currentUserId, hasMilitaryTimeFormat}: DisplayClockProps) => {
    const [isMilitaryTimeFormat, setIsMilitaryTimeFormat] = useState(hasMilitaryTimeFormat);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const onSelectClockPreference = useCallback((clockType: keyof typeof CLOCK_TYPE) => {
        setIsMilitaryTimeFormat(clockType === CLOCK_TYPE.MILITARY);
    }, []);

    const close = () => popTopScreen(componentId);

    const saveClockDisplayPreference = useCallback(() => {
        if (hasMilitaryTimeFormat !== isMilitaryTimeFormat) {
            const timePreference: PreferenceType = {
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: 'use_military_time',
                user_id: currentUserId,
                value: `${isMilitaryTimeFormat}`,
            };

            savePreference(serverUrl, [timePreference]);
        }

        close();
    }, [hasMilitaryTimeFormat, isMilitaryTimeFormat, serverUrl]);

    useBackNavigation(saveClockDisplayPreference);

    useAndroidHardwareBackHandler(componentId, saveClockDisplayPreference);

    return (
        <SettingContainer testID='clock_display_settings'>
            <SettingBlock
                disableHeader={true}
            >
                <SettingOption
                    action={onSelectClockPreference}
                    label={intl.formatMessage({id: 'settings_display.clock.standard', defaultMessage: '12-hour clock'})}
                    description={intl.formatMessage({id: 'settings_display.clock.normal.desc', defaultMessage: 'Example: 4:00 PM'})}
                    selected={!isMilitaryTimeFormat}
                    testID='clock_display_settings.twelve_hour.option'
                    type='select'
                    value={CLOCK_TYPE.NORMAL}
                />
                <SettingSeparator/>
                <SettingOption
                    action={onSelectClockPreference}
                    label={intl.formatMessage({id: 'settings_display.clock.mz', defaultMessage: '24-hour clock'})}
                    description={intl.formatMessage({id: 'settings_display.clock.mz.desc', defaultMessage: 'Example: 16:00'})}
                    selected={isMilitaryTimeFormat}
                    testID='clock_display_settings.twenty_four_hour.option'
                    type='select'
                    value={CLOCK_TYPE.MILITARY}
                />
                <SettingSeparator/>
            </SettingBlock>
        </SettingContainer>
    );
};

export default DisplayClock;
