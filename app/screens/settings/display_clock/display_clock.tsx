// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import {savePreference} from '@actions/remote/preference';
import OptionItem from '@components/option_item';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {t} from '@i18n';
import {popTopScreen, setButtons} from '@screens/navigation';
import {getSaveButton} from '@screens/settings/config';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import SettingBlock from '../setting_block';

const footer = {
    id: t('settings_display.clock.preferTime'),
    defaultMessage: 'Select how you prefer time displayed.',
};

const edges: Edge[] = ['left', 'right'];
const CLOCK_TYPE = {
    NORMAL: 'NORMAL',
    MILITARY: 'MILITARY',
} as const;

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            flex: 1,
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        containerStyle: {
            paddingHorizontal: 20,
        },
    };
});

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

    const styles = getStyleSheet(theme);

    const saveButton = useMemo(() => getSaveButton(SAVE_CLOCK_BUTTON_ID, intl, theme), [theme.sidebarHeaderTextColor]);

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
        <SafeAreaView
            edges={edges}
            style={styles.container}
            testID='settings_display.screen'
        >
            <SettingBlock
                disableHeader={true}
                footerText={footer}
            >
                <OptionItem
                    action={onSelectClockPreference}
                    containerStyle={styles.containerStyle}
                    label={intl.formatMessage({id: 'settings_display.clock.normal', defaultMessage: '12-hour clock (example: 4:00 PM)'})}
                    selected={!isMilitaryTimeFormat}
                    testID='clock_display_settings.normal_clock.action'
                    type='select'
                    value={CLOCK_TYPE.NORMAL}
                />
                <View style={styles.divider}/>
                <OptionItem
                    action={onSelectClockPreference}
                    containerStyle={styles.containerStyle}
                    label={intl.formatMessage({id: 'settings_display.clock.military', defaultMessage: '24-hour clock (example: 16:00)'})}
                    selected={isMilitaryTimeFormat}
                    testID='clock_display_settings.military_clock.action'
                    type='select'
                    value={CLOCK_TYPE.MILITARY}
                />
            </SettingBlock>
        </SafeAreaView>
    );
};

export default DisplayClock;
