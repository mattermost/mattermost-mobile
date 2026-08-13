// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import {handleGotoLocation} from '@actions/remote/command';
import MenuDivider from '@components/menu_divider';
import SettingContainer from '@components/settings/container';
import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {useServerDisplayName, useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateBack, navigateToSettingsScreen} from '@screens/navigation';

import ReportProblem from './report_problem';

type SettingsProps = {
    helpLink: string;
    showHelp: boolean;
    siteName: string;
}

const Settings = ({helpLink, showHelp, siteName}: SettingsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const serverDisplayName = useServerDisplayName();

    const serverName = siteName || serverDisplayName;

    useAndroidHardwareBackHandler(Screens.SETTINGS, navigateBack);

    const goToNotifications = usePreventDoubleTap(useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_NOTIFICATION);
    }, []));

    const goToDisplaySettings = usePreventDoubleTap(useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_DISPLAY);
    }, []));

    const goToAbout = usePreventDoubleTap(useCallback(() => {
        const title = intl.formatMessage({id: 'settings.about', defaultMessage: 'About {appTitle}'}, {appTitle: serverName});

        navigateToSettingsScreen(Screens.ABOUT, {headerTitle: title});
    }, [intl, serverName]));

    const goToAdvancedSettings = usePreventDoubleTap(useCallback(() => {
        navigateToSettingsScreen(Screens.SETTINGS_ADVANCED);
    }, []));

    const openHelp = usePreventDoubleTap(useCallback(() => {
        if (helpLink) {
            handleGotoLocation(serverUrl, intl, helpLink);
        }
    }, [helpLink, intl, serverUrl]));

    return (
        <SettingContainer testID='settings'>
            <SettingItem
                onPress={goToNotifications}
                optionName='notification'
                testID='settings.notifications.option'
            />
            <SettingItem
                onPress={goToDisplaySettings}
                optionName='display'
                testID='settings.display.option'
            />
            <SettingItem
                onPress={goToAdvancedSettings}
                optionName='advanced_settings'
                testID='settings.advanced_settings.option'
            />
            <SettingItem
                icon='information-outline'
                label={intl.formatMessage({id: 'settings.about', defaultMessage: 'About {appTitle}'}, {appTitle: serverName})}
                onPress={goToAbout}
                optionName='about'
                testID='settings.about.option'
            />
            {Platform.OS === 'android' && <MenuDivider/>}
            {showHelp &&
                <SettingItem
                    onPress={openHelp}
                    optionName='help'
                    separator={false}
                    testID='settings.help.option'
                    type='link'
                />
            }
            <ReportProblem/>
        </SettingContainer>
    );
};

export default Settings;
