// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {BackHandler, Platform, ScrollView, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import MenuItem from '@components/menu_item';
import {useTheme} from '@context/theme';
import {t} from '@i18n';
import {dismissModal, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
        form: {
            backgroundColor: theme.centerChannelBg,
        },
    };
});

type SettingsProps = {
    componentId: string;
    siteName: string;
    showHelp: boolean;
}

//todo: handle display on tablet

const Settings = ({componentId, showHelp, siteName}: SettingsProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const closeButton = useMemo(() => {
        return {
            id: CLOSE_BUTTON_ID,
            icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
            testID: CLOSE_BUTTON_ID,
        };
    }, [theme.centerChannelColor]);

    const close = useCallback(() => {
        dismissModal({componentId});

        return true;
    }, []);

    useEffect(() => {
        setButtons(componentId, {
            leftButtons: [closeButton],
        });
    }, []);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', close);
        return () => {
            backHandler.remove();
        };
    }, []);

    useEffect(() => {
        const unsubscribe = Navigation.events().registerComponentListener({
            navigationButtonPressed: ({buttonId}: { buttonId: string }) => {
                if (buttonId === CLOSE_BUTTON_ID) {
                    close();
                }
            },
        }, componentId);

        return () => {
            unsubscribe.remove();
        };
    }, []);

    const goToNotifications = () => null;

    let showArrow = false;

    let middleDividerStyle = styles.divider;
    if (Platform.OS === 'ios') {
        showArrow = true;
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
                    style={styles.form}
                >
                    <MenuItem
                        defaultMessage='Notifications'
                        i18nId={t('user.settings.modal.notifications')}
                        iconName='bell-outline'
                        onPress={goToNotifications}
                        separator={true}
                        showArrow={showArrow}
                        testID='general_settings.notifications.action'
                        theme={theme}
                    />
                    <MenuItem
                        defaultMessage='Display'
                        i18nId={t('user.settings.modal.display')}
                        iconName='layers-outline'
                        onPress={goToNotifications}
                        separator={true}
                        showArrow={showArrow}
                        testID='general_settings.display.action'
                        theme={theme}
                    />
                    <MenuItem
                        defaultMessage='Advanced Settings'
                        i18nId={t('mobile.advanced_settings.title')}
                        iconName='tune'
                        onPress={goToNotifications}
                        separator={true}
                        showArrow={showArrow}
                        testID='general_settings.advanced.action'
                        theme={theme}
                    />
                    <MenuItem
                        defaultMessage='About {appTitle}'
                        i18nId={t('about.title')}
                        iconName='information-outline'
                        messageValues={{appTitle: siteName}}
                        onPress={goToNotifications}
                        separator={false}
                        showArrow={showArrow}
                        testID='general_settings.about.action'
                        theme={theme}
                    />
                </View>
                <View style={middleDividerStyle}/>
                <View
                    style={[styles.form]}
                >
                    {true &&
                    <MenuItem
                        defaultMessage='Help'
                        i18nId={t('mobile.help.title')}
                        onPress={goToNotifications}
                        separator={true}
                        showArrow={false}
                        testID='general_settings.help.action'
                        theme={theme}
                        innerContainerStyle={{paddingLeft: 16}}

                        // isLink={true}
                    />
                    }
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Settings;
