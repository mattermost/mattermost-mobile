// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Alert, BackHandler, Platform, ScrollView, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {Edge, SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {SettingOptionConfig} from '@constants/settings';
import {useTheme} from '@context/theme';
import {dismissModal, goToScreen, setButtons} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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
    siteName: string;
    showHelp: boolean;
}

//todo: handle display on tablet and Profile the whole feature - https://mattermost.atlassian.net/browse/MM-39711

const Settings = ({componentId, showHelp, siteName}: SettingsProps) => {
    const theme = useTheme();
    const intl = useIntl();
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

    const onPressHandler = () => {
        return Alert.alert(
            'The functionality you are trying to use has not yet been implemented.',
        );
    };

    const goToAbout = preventDoubleTap(() => {
        const screen = Screens.ABOUT;
        const title = intl.formatMessage({id: 'about.title', defaultMessage: 'About {appTitle}'}, {appTitle: siteName});

        goToScreen(screen, title);
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
                        config={SettingOptionConfig.notification}
                        onPress={onPressHandler}
                    />
                    <SettingOption
                        config={SettingOptionConfig.display}
                        onPress={onPressHandler}
                    />
                    <SettingOption
                        config={SettingOptionConfig.advanced_settings}
                        onPress={onPressHandler}
                    />
                    <SettingOption
                        config={SettingOptionConfig.about}
                        onPress={goToAbout}
                        messageValues={{appTitle: siteName}}
                        separator={Platform.OS === 'ios'}
                    />
                </View>
                <View style={middleDividerStyle}/>
                <View
                    style={styles.group}
                >
                    {showHelp &&
                    <SettingOption
                        config={SettingOptionConfig.help}
                        onPress={onPressHandler}
                        isLink={true}
                        innerContainerStyle={styles.innerContainerStyle}
                    />
                    }
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Settings;
