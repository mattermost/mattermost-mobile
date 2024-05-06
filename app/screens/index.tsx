// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Provider as EMMProvider} from '@mattermost/react-native-emm';
import React, {type ComponentType} from 'react';
import {IntlProvider} from 'react-intl';
import {Platform, type StyleProp, type ViewStyle} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Navigation} from 'react-native-navigation';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {Screens} from '@constants';
import {withServerDatabase} from '@database/components';
import {DEFAULT_LOCALE, getTranslations} from '@i18n';

const withGestures = (Screen: React.ComponentType, styles: StyleProp<ViewStyle>) => {
    return function gestureHoc(props: any) {
        return (
            <GestureHandlerRootView style={[{flex: 1}, styles]}>
                <Screen {...props}/>
            </GestureHandlerRootView>
        );
    };
};

const withIntl = (Screen: React.ComponentType) => {
    return function IntlEnabledComponent(props: any) {
        return (
            <IntlProvider
                locale={DEFAULT_LOCALE}
                messages={getTranslations(DEFAULT_LOCALE)}
            >
                <Screen {...props}/>
            </IntlProvider>
        );
    };
};

const withSafeAreaInsets = (Screen: React.ComponentType) => {
    return function SafeAreaInsets(props: any) {
        return (
            <SafeAreaProvider>
                <Screen {...props}/>
            </SafeAreaProvider>
        );
    };
};

const withManagedConfig = (Screen: React.ComponentType) => {
    return function EmmProvider(props: any) {
        return (
            <EMMProvider>
                <Screen {...props}/>
            </EMMProvider>
        );
    };
};

Navigation.setLazyComponentRegistrator((screenName) => {
    let screen: any|undefined;
    let extraStyles: StyleProp<ViewStyle>;
    switch (screenName) {
        case Screens.ABOUT:
            screen = withServerDatabase(require('@screens/settings/about').default);
            break;
        case Screens.APPS_FORM:
            screen = withServerDatabase(require('@screens/apps_form').default);
            break;
        case Screens.BOTTOM_SHEET:
            screen = withServerDatabase(require('@screens/bottom_sheet').default);
            Navigation.registerComponent(Screens.BOTTOM_SHEET, () =>
                withGestures(withSafeAreaInsets(withManagedConfig(screen)), undefined),
            );
            return;
        case Screens.BROWSE_CHANNELS:
            screen = withServerDatabase(require('@screens/browse_channels').default);
            break;
        case Screens.CHANNEL:
            screen = withServerDatabase(require('@screens/channel').default);
            break;
        case Screens.CHANNEL_NOTIFICATION_PREFERENCES:
            screen = withServerDatabase(require('@screens/channel_notification_preferences').default);
            break;
        case Screens.CHANNEL_FILES:
            screen = withServerDatabase(require('@screens/channel_files').default);
            break;
        case Screens.CHANNEL_INFO:
            screen = withServerDatabase(require('@screens/channel_info').default);
            break;
        case Screens.CODE:
            screen = withServerDatabase(require('@screens/code').default);
            break;
        case Screens.CONVERT_GM_TO_CHANNEL:
            screen = withServerDatabase(require('@screens/convert_gm_to_channel').default);
            break;
        case Screens.CREATE_OR_EDIT_CHANNEL:
            screen = withServerDatabase(require('@screens/create_or_edit_channel').default);
            break;
        case Screens.CUSTOM_STATUS:
            screen = withServerDatabase(require('@screens/custom_status').default);
            break;
        case Screens.CUSTOM_STATUS_CLEAR_AFTER:
            screen = withServerDatabase(require('@screens/custom_status_clear_after').default);
            break;
        case Screens.CREATE_DIRECT_MESSAGE:
            screen = withServerDatabase(require('@screens/create_direct_message').default);
            break;
        case Screens.CHANNEL_ADD_MEMBERS:
            screen = withServerDatabase(require('@screens/channel_add_members').default);
            break;
        case Screens.EDIT_POST:
            screen = withServerDatabase(require('@screens/edit_post').default);
            break;
        case Screens.EDIT_PROFILE:
            screen = withServerDatabase(require('@screens/edit_profile').default);
            break;
        case Screens.EDIT_SERVER:
            screen = withIntl(require('@screens/edit_server').default);
            break;
        case Screens.EMOJI_PICKER:
            screen = withServerDatabase(require('@screens/emoji_picker').default);
            break;
        case Screens.FIND_CHANNELS:
            screen = withServerDatabase(require('@screens/find_channels').default);
            break;
        case Screens.FORGOT_PASSWORD:
            screen = withIntl(require('@screens/forgot_password').default);
            break;
        case Screens.GALLERY:
            screen = withServerDatabase(require('@screens/gallery').default);
            break;
        case Screens.GLOBAL_THREADS:
            screen = withServerDatabase(require('@screens/global_threads').default);
            break;
        case Screens.INTERACTIVE_DIALOG:
            screen = withServerDatabase(require('@screens/interactive_dialog').default);
            break;
        case Screens.INTEGRATION_SELECTOR:
            screen = withServerDatabase(require('@screens/integration_selector').default);
            break;
        case Screens.INVITE:
            screen = withServerDatabase(require('@screens/invite').default);
            break;
        case Screens.IN_APP_NOTIFICATION: {
            const notificationScreen = require('@screens/in_app_notification').default;
            Navigation.registerComponent(Screens.IN_APP_NOTIFICATION, () =>
                Platform.select({
                    default: notificationScreen,
                    ios: withSafeAreaInsets(notificationScreen),
                }),
            );
            return;
        }
        case Screens.JOIN_TEAM:
            screen = withServerDatabase(require('@screens/join_team').default);
            break;
        case Screens.LATEX:
            screen = withServerDatabase(require('@screens/latex').default);
            break;
        case Screens.LOGIN:
            screen = withIntl(require('@screens/login').default);
            break;
        case Screens.MANAGE_CHANNEL_MEMBERS:
            screen = withServerDatabase(require('@screens/manage_channel_members').default);
            break;
        case Screens.MFA:
            screen = withIntl(require('@screens/mfa').default);
            break;
        case Screens.SELECT_TEAM:
            screen = withServerDatabase(require('@screens/select_team').default);
            break;
        case Screens.PERMALINK:
            screen = withServerDatabase(require('@screens/permalink').default);
            break;
        case Screens.PINNED_MESSAGES:
            screen = withServerDatabase(require('@screens/pinned_messages').default);
            break;
        case Screens.POST_OPTIONS:
            screen = withServerDatabase(require('@screens/post_options').default);
            break;
        case Screens.POST_PRIORITY_PICKER:
            screen = withServerDatabase(require('@screens/post_priority_picker').default);
            break;
        case Screens.REACTIONS:
            screen = withServerDatabase(require('@screens/reactions').default);
            break;
        case Screens.REVIEW_APP:
            screen = withServerDatabase(require('@screens/review_app').default);
            break;
        case Screens.SETTINGS:
            screen = withServerDatabase(require('@screens/settings').default);
            break;
        case Screens.SETTINGS_ADVANCED:
            screen = withServerDatabase(require('@screens/settings/advanced').default);
            break;
        case Screens.SETTINGS_DISPLAY:
            screen = withServerDatabase(require('@screens/settings/display').default);
            break;
        case Screens.SETTINGS_DISPLAY_CLOCK:
            screen = withServerDatabase(require('@screens/settings/display_clock').default);
            break;
        case Screens.SETTINGS_DISPLAY_CRT:
            screen = withServerDatabase(require('@screens/settings/display_crt').default);
            break;
        case Screens.SETTINGS_DISPLAY_THEME:
            screen = withServerDatabase(require('@screens/settings/display_theme').default);
            break;
        case Screens.SETTINGS_DISPLAY_TIMEZONE:
            screen = withServerDatabase(require('@screens/settings/display_timezone').default);
            break;
        case Screens.SETTINGS_DISPLAY_TIMEZONE_SELECT:
            screen = withServerDatabase(require('@screens/settings/display_timezone_select').default);
            break;
        case Screens.SETTINGS_NOTIFICATION:
            screen = withServerDatabase(require('@screens/settings/notifications').default);
            break;
        case Screens.SETTINGS_NOTIFICATION_AUTO_RESPONDER:
            screen = withServerDatabase(require('@screens/settings/notification_auto_responder').default);
            break;
        case Screens.SETTINGS_NOTIFICATION_EMAIL:
            screen = withServerDatabase(require('@screens/settings/notification_email').default);
            break;
        case Screens.SETTINGS_NOTIFICATION_MENTION:
            screen = withServerDatabase(require('@screens/settings/notification_mention').default);
            break;
        case Screens.SETTINGS_NOTIFICATION_PUSH:
            screen = withServerDatabase(require('@screens/settings/notification_push').default);
            break;
        case Screens.SHARE_FEEDBACK:
            screen = withServerDatabase(require('@screens/share_feedback').default);
            break;
        case Screens.SNACK_BAR: {
            const snackBarScreen = withServerDatabase(require('@screens/snack_bar').default);
            Navigation.registerComponent(Screens.SNACK_BAR, () =>
                Platform.select({
                    default: snackBarScreen,
                    ios: withSafeAreaInsets(snackBarScreen) as ComponentType,
                }),
            );
            break;
        }
        case Screens.SSO:
            screen = withIntl(require('@screens/sso').default);
            break;
        case Screens.TABLE:
            screen = withServerDatabase(require('@screens/table').default);
            break;
        case Screens.TEAM_SELECTOR_LIST:
            screen = withServerDatabase(require('@screens/convert_gm_to_channel/team_selector_list').default);
            break;
        case Screens.TERMS_OF_SERVICE:
            screen = withServerDatabase(require('@screens/terms_of_service').default);
            break;
        case Screens.THREAD:
            screen = withServerDatabase(require('@screens/thread').default);
            break;
        case Screens.THREAD_FOLLOW_BUTTON:
            Navigation.registerComponent(Screens.THREAD_FOLLOW_BUTTON, () => withServerDatabase(
                require('@screens/thread/thread_follow_button').default,
            ));
            break;
        case Screens.THREAD_OPTIONS:
            screen = withServerDatabase(require('@screens/thread_options').default);
            break;
        case Screens.USER_PROFILE:
            screen = withServerDatabase(require('@screens/user_profile').default);
            break;
        case Screens.CALL:
            screen = withServerDatabase(require('@calls/screens/call_screen').default);
            break;
        case Screens.CALL_PARTICIPANTS:
            screen = withServerDatabase(require('@calls/screens/participants_list').default);
            break;
        case Screens.CALL_HOST_CONTROLS:
            screen = withServerDatabase(require('@calls/screens/host_controls').default);
            break;
    }

    if (screen) {
        Navigation.registerComponent(screenName, () => withGestures(withSafeAreaInsets(withManagedConfig(screen)), extraStyles));
    }
});

export function registerScreens() {
    const homeScreen = require('@screens/home').default;
    const serverScreen = require('@screens/server').default;
    const onboardingScreen = require('@screens/onboarding').default;
    Navigation.registerComponent(Screens.ONBOARDING, () => withGestures(withIntl(withManagedConfig(onboardingScreen)), undefined));
    Navigation.registerComponent(Screens.SERVER, () => withGestures(withIntl(withManagedConfig(serverScreen)), undefined));
    Navigation.registerComponent(Screens.HOME, () => withGestures(withSafeAreaInsets(withServerDatabase(withManagedConfig(homeScreen))), undefined));
}
