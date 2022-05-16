// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {BackHandler, Platform, ScrollView, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {dismissModal, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
            paddingLeft: 16,
        },
        menuLabel: {
            color: theme.centerChannelColor,
            fontSize: 16,
            lineHeight: 24,
            fontFamily: 'OpenSans',
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
                        type='notification'
                        onPress={goToNotifications}
                    />
                    <SettingOption
                        type='display'
                        onPress={goToNotifications}
                    />
                    <SettingOption
                        type='advanced_settings'
                        onPress={goToNotifications}
                    />
                    <SettingOption
                        type='about'
                        onPress={goToNotifications}
                        messageValues={{appTitle: siteName}}
                    />
                </View>
                <View style={middleDividerStyle}/>
                <View
                    style={styles.group}
                >
                    {showHelp &&
                    <SettingOption
                        type='help'
                        onPress={goToNotifications}
                        isLink={true}
                    />
                    }
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Settings;
