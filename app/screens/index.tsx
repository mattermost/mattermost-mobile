// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withManagedConfig} from '@mattermost/react-native-emm';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {Platform, StyleProp, ViewStyle} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {withServerDatabase} from '@database/components';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';

// TODO: Remove this and uncomment screens as they get added
/* eslint-disable */

const withGestures = (Screen: React.ComponentType, styles: StyleProp<ViewStyle>) => {
    return function gestureHoc(props: any) {
        if (Platform.OS === 'android') {
            return (
                <GestureHandlerRootView style={[{flex: 1}, styles]}>
                    <Screen {...props}/>
                </GestureHandlerRootView>
            )
        }

        return <Screen {...props}/>;
    }
};

const withIntl = (Screen: React.ComponentType) => {
    return function IntlEnabledComponent(props: any) {
        return (
            <IntlProvider
                locale={DEFAULT_LOCALE}
                messages={getTranslations()}
            >
                <Screen {...props}/>
            </IntlProvider>
    );
        }
}

const withSafeAreaInsets = (Screen: React.ComponentType) => {
    return function SafeAreaInsets(props: any){
        return (
            <SafeAreaProvider>
                <Screen {...props} />
            </SafeAreaProvider>
        )
    }
}

Navigation.setLazyComponentRegistrator((screenName) => {
    let screen: any|undefined;
    let extraStyles: StyleProp<ViewStyle>;
    switch (screenName) {
    case Screens.ABOUT:
        screen =  withServerDatabase(require('@screens/about').default);
        break;
    case Screens.BOTTOM_SHEET:
        screen = withServerDatabase(require('@screens/bottom_sheet').default);
        break;
    case Screens.CHANNEL:
        screen = withServerDatabase(require('@screens/channel').default);
        break;
    case Screens.CUSTOM_STATUS:
        screen = withServerDatabase(require('@screens/custom_status').default);
        break;
    case Screens.CUSTOM_STATUS_CLEAR_AFTER:
        screen = withServerDatabase(require('@screens/custom_status_clear_after').default);
        break;
    case Screens.EMOJI_PICKER:
        screen = withServerDatabase(require('@screens/emoji_picker').default);
        break;
    case Screens.EDIT_PROFILE:
        screen = withServerDatabase((require('@screens/edit_profile').default));
        break;
    case Screens.EDIT_SERVER:
        screen = withIntl(require('@screens/edit_server').default);
        break;
    case Screens.FORGOT_PASSWORD:
        screen = withIntl(require('@screens/forgot_password').default);
        break;
    case Screens.GALLERY:
        screen = withServerDatabase((require('@screens/gallery').default));
        break;
    case Screens.IN_APP_NOTIFICATION: {
        const notificationScreen = require('@screens/in_app_notification').default;
        Navigation.registerComponent(Screens.IN_APP_NOTIFICATION, () => Platform.select({
            default: notificationScreen,
            ios: withSafeAreaInsets(notificationScreen),
        }));
        return;
    }
    case Screens.LOGIN:
        screen = withIntl(require('@screens/login').default);
        break;
    case Screens.MFA:
        screen = withIntl(require('@screens/mfa').default);
        break;
    case Screens.BROWSE_CHANNELS:
        screen = withServerDatabase(require('@screens/browse_channels').default);
        break;
    case Screens.POST_OPTIONS:
        screen = withServerDatabase(require('@screens/post_options').default);
        break;
    case Screens.SSO:
        screen = withIntl(require('@screens/sso').default);
        break;
    case Screens.THREAD:
        screen = withServerDatabase(require('@screens/thread').default);
        break;
    }

    if (screen) {
        Navigation.registerComponent(screenName, () => withGestures(withSafeAreaInsets(withManagedConfig(screen)), extraStyles));
    }
});

export function registerScreens() {
    const homeScreen = require('@screens/home').default;
    const serverScreen = require('@screens/server').default;
    Navigation.registerComponent(Screens.SERVER, () => withGestures(withIntl(withManagedConfig(serverScreen)), undefined));
    Navigation.registerComponent(Screens.HOME, () => withGestures(withSafeAreaInsets(withServerDatabase(withManagedConfig(homeScreen))), undefined));
}
