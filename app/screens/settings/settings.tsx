// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, ScrollView, View} from 'react-native';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useServerDisplayName} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {tryOpenURL} from '@utils/url';

import SettingOption from './setting_option';

const edges: Edge[] = ['left', 'right'];
const CLOSE_BUTTON_ID = 'close-settings';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
        },
        wrapper: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
            ...Platform.select({
                ios: {
                    flex: 1,
                    paddingTop: 35,
                },
            }),
        },
        divider: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 1,
        },
        middleDivider: {
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            height: 35,
        },
        group: {
            backgroundColor: theme.centerChannelBg,
        },
        innerContainerStyle: {
            paddingLeft: 8,
        },
        menuLabel: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
    };
});

type SettingsProps = {
    componentId: string;
    helpLink: string;
    showHelp: boolean;
    siteName: string;
}

//todo: handle display on tablet and Profile the whole feature - https://mattermost.atlassian.net/browse/MM-39711

const Settings = ({componentId, helpLink, showHelp, siteName}: SettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);
    const serverDisplayName = useServerDisplayName();
    const serverName = siteName || serverDisplayName;

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

    let middleDividerStyle = styles.divider;
    if (Platform.OS === 'ios') {
        middleDividerStyle = styles.middleDivider;
    }

    return (
        <SafeAreaView
            edges={edges}
            style={styles.container}
            testID='account.screen'
        >
            <ScrollView
                alwaysBounceVertical={false}
                contentContainerStyle={styles.wrapper}
            >
                <View style={styles.divider}/>
                <View
                    style={styles.group}
                >
                    <SettingOption
                        optionName='notification'
                        onPress={goToNotifications}
                    />
                    <SettingOption
                        optionName='display'
                        onPress={goToDisplaySettings}
                    />
                    <SettingOption
                        optionName='advanced_settings'
                        onPress={goToAdvancedSettings}
                    />
                    <SettingOption
                        optionName='about'
                        onPress={goToAbout}
                        messageValues={{appTitle: serverName}}
                        separator={Platform.OS === 'ios'}
                    />
                </View>
                <View style={middleDividerStyle}/>
                <View
                    style={styles.group}
                >
                    {showHelp &&
                    <SettingOption
                        optionName='help'
                        onPress={openHelp}
                        isLink={true}
                        containerStyle={styles.innerContainerStyle}
                    />
                    }
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Settings;
