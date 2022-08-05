// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useServerDisplayName} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import SettingContainer from '@screens/settings/setting_container';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {tryOpenURL} from '@utils/url';

import SettingItem from './setting_item';

const CLOSE_BUTTON_ID = 'close-settings';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        containerStyle: {
            paddingLeft: 8,
            marginTop: 12,
        },
        helpGroup: {
            width: '91%',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: 1,
            alignSelf: 'center',

            // marginTop: 20,
        },
    };
});

type SettingsProps = {
    componentId: string;
    helpLink: string;
    showHelp: boolean;
    siteName: string;
}

//todo: Profile the whole feature - https://mattermost.atlassian.net/browse/MM-39711

const Settings = ({componentId, helpLink, showHelp, siteName}: SettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverDisplayName = useServerDisplayName();

    const serverName = siteName || serverDisplayName;
    const styles = getStyleSheet(theme);

    const closeButton = useMemo(() => {
        return {
            id: CLOSE_BUTTON_ID,
            icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
            testID: CLOSE_BUTTON_ID,
        };
    }, [theme.centerChannelColor]);

    const close = () => {
        dismissModal({componentId});
    };

    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [closeButton],
        });
    }, []);

    useAndroidHardwareBackHandler(componentId, close);

    useNavButtonPressed(CLOSE_BUTTON_ID, componentId, close, []);

    const goToNotifications = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_NOTIFICATION;
        const title = intl.formatMessage({id: 'settings.notifications', defaultMessage: 'Notifications'});

        goToScreen(screen, title);
    });

    const goToDisplaySettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_DISPLAY;
        const title = intl.formatMessage({id: 'settings.display', defaultMessage: 'Display'});

        goToScreen(screen, title);
    });

    const goToAbout = preventDoubleTap(() => {
        const screen = Screens.ABOUT;
        const title = intl.formatMessage({id: 'settings.about', defaultMessage: 'About {appTitle}'}, {appTitle: serverName});

        goToScreen(screen, title);
    });

    const goToAdvancedSettings = preventDoubleTap(() => {
        const screen = Screens.SETTINGS_ADVANCED;
        const title = intl.formatMessage({id: 'settings.advanced_settings', defaultMessage: 'Advanced Settings'});

        goToScreen(screen, title);
    });

    const openHelp = preventDoubleTap(() => {
        const link = helpLink ? helpLink.toLowerCase() : '';

        if (link) {
            const onError = () => {
                Alert.alert(
                    intl.formatMessage({id: 'mobile.link.error.title', defaultMessage: 'Error'}),
                    intl.formatMessage({id: 'mobile.link.error.text', defaultMessage: 'Unable to open the link.'}),
                );
            };

            tryOpenURL(link, onError);
        }
    });

    return (
        <SettingContainer>
            <SettingItem
                onPress={goToNotifications}
                optionName='notification'
            />
            <SettingItem
                onPress={goToDisplaySettings}
                optionName='display'
            />
            <SettingItem
                onPress={goToAdvancedSettings}
                optionName='advanced_settings'
            />
            <SettingItem
                icon='information-outline'
                label={intl.formatMessage({id: 'settings.about', defaultMessage: 'About {appTitle}'}, {appTitle: serverName})}
                onPress={goToAbout}
                optionName='about'
                testID='general_settings.about'
            />
            {Platform.OS === 'android' && <View style={styles.helpGroup}/>}
            {showHelp &&
            <SettingItem
                optionLabelTextStyle={{color: theme.linkColor}}
                onPress={openHelp}
                optionName='help'
                separator={false}
                type='default'
            />
            }
        </SettingContainer>
    );
};

export default Settings;
