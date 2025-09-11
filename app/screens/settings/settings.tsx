// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import {handleGotoLocation} from '@actions/remote/command';
import CompassIcon from '@components/compass_icon';
import MenuDivider from '@components/menu_divider';
import SettingContainer from '@components/settings/container';
import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {useServerDisplayName, useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';

import ReportProblem from './report_problem';

import type {AvailableScreens} from '@typings/screens/navigation';

const CLOSE_BUTTON_ID = 'close-settings';

type SettingsProps = {
    componentId: AvailableScreens;
    helpLink: string;
    showHelp: boolean;
    siteName: string;
}

const Settings = ({componentId, helpLink, showHelp, siteName}: SettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const serverDisplayName = useServerDisplayName();

    const serverName = siteName || serverDisplayName;

    const closeButton = useMemo(() => {
        return {
            id: CLOSE_BUTTON_ID,
            icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
            testID: 'close.settings.button',
        };
    }, [theme.centerChannelColor]);

    const close = useCallback(() => {
        dismissModal({componentId});
    }, [componentId]);

    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [closeButton],
        });
    }, []);

    useAndroidHardwareBackHandler(componentId, close);
    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, []);

    const goToNotifications = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_NOTIFICATION;
        const title = intl.formatMessage({id: 'settings.notifications', defaultMessage: 'Notifications'});

        goToScreen(screen, title);
    }, [intl]));

    const goToDisplaySettings = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_DISPLAY;
        const title = intl.formatMessage({id: 'settings.display', defaultMessage: 'Display'});

        goToScreen(screen, title);
    }, [intl]));

    const goToAbout = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.ABOUT;
        const title = intl.formatMessage({id: 'settings.about', defaultMessage: 'About {appTitle}'}, {appTitle: serverName});

        goToScreen(screen, title);
    }, [intl, serverName]));

    const goToAdvancedSettings = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_ADVANCED;
        const title = intl.formatMessage({id: 'settings.advanced_settings', defaultMessage: 'Advanced Settings'});

        goToScreen(screen, title);
    }, [intl]));

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
