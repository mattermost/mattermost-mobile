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
    };
});

type SettingsProps = {
    componentId: string;
}

//todo: handle display on tablet

const Settings = ({componentId}: SettingsProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const closeButton = useMemo(() => {
        //todo: handle tablet -> perhaps return null;
        return {
            id: CLOSE_BUTTON_ID,
            icon: CompassIcon.getImageSourceSync('close', 24, theme.centerChannelColor),
            testID: CLOSE_BUTTON_ID,
        };
    }, [theme.centerChannelColor]);

    const close = useCallback(() => {
        //todo: handle tablet -> perhaps emit Events.ACCOUNT_SELECT_TABLET_VIEW
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
    const showTeams = false; //todo: figure this out
    const showHelp = true; //todo: figure this out

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
                {showTeams && (
                    <MenuItem
                        defaultMessage='Open teams you can join'
                        i18nId={t('mobile.select_team.join_open')}
                        iconName='menu'
                        onPress={goToNotifications}
                        separator={true}
                        showArrow={showArrow}
                        testID='general_settings.select_team.action'
                        theme={theme}
                    />
                )}
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
                    testID='general_settings.about.action'
                    defaultMessage='About {appTitle}'
                    i18nId={t('about.title')}
                    iconName='information-outline'
                    onPress={goToNotifications}
                    separator={false}
                    showArrow={showArrow}
                    theme={theme}

                    // messageValues={{appTitle: config.SiteName || 'Mattermost'}}
                />
                <View style={middleDividerStyle}/>
                {showHelp &&
                    <MenuItem
                        defaultMessage='Help'
                        i18nId={t('mobile.help.title')}
                        onPress={goToNotifications}
                        separator={true}
                        showArrow={false}
                        testID='general_settings.help.action'
                        theme={theme}

                        // isLink={true}
                    />
                }
            </ScrollView>
        </SafeAreaView>
    );
};

export default Settings;
