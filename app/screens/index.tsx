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
    // case 'AdvancedSettings':
    //     screen = require('@screens/settings/advanced_settings').default;
    //     break;
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
    // case 'ChannelAddMembers':
    //     screen = require('@screens/channel_add_members').default;
    //     break;
    // case 'ChannelInfo':
    //     screen = require('@screens/channel_info').default;
    //     break;
    // case 'ChannelMembers':
    //     screen = require('@screens/channel_members').default;
    //     break;
    // case 'ChannelNotificationPreference':
    //     screen = require('@screens/channel_notification_preference').default;
    //     break;
    // case 'ClientUpgrade':
    //     screen = require('@screens/client_upgrade').default;
    //     break;
    // case 'ClockDisplaySettings':
    //     screen = require('@screens/settings/clock_display').default;
    //     break;
    // case 'Code':
    //     screen = require('@screens/code').default;
    //     break;
    // case 'CreateChannel':
    //     screen = require('@screens/create_channel').default;
    //     break;
    // case 'DisplaySettings':
    //     screen = require('@screens/settings/display_settings').default;
    //     break;
    // case 'EditChannel':
    //     screen = require('@screens/edit_channel').default;
    //     break;
    // case 'EditPost':
    //     screen = require('@screens/edit_post').default;
    //     break;
    case Screens.EDIT_PROFILE:
        screen = withServerDatabase((require('@screens/edit_profile').default));
        break;
    // case 'ErrorTeamsList':
    //     screen = require('@screens/error_teams_list').default;
    //     break;
    // case 'ExpandedAnnouncementBanner':
    //     screen = require('@screens/expanded_announcement_banner').default;
    //     break;
    // case 'FlaggedPosts':
    //     screen = require('@screens/flagged_posts').default;
    //     break;
    case Screens.FORGOT_PASSWORD:
        screen = withIntl(require('@screens/forgot_password').default);
        break;
    case Screens.IN_APP_NOTIFICATION: {
        const notificationScreen = require('@screens/in_app_notification').default;
        Navigation.registerComponent(Screens.IN_APP_NOTIFICATION, () => Platform.select({
            default: withGestures(notificationScreen, undefined),
            ios: withSafeAreaInsets(notificationScreen),
        }));
        return;
    }
    // case 'Gallery':
    //     screen = require('@screens/gallery').default;
    //     break;
    // case 'InteractiveDialog':
    //     screen = require('@screens/interactive_dialog').default;
    //     break;
    case Screens.LOGIN:
        screen = withIntl(require('@screens/login').default);
        break;
    // case 'LongPost':
    //     screen = require('@screens/long_post').default;
    //     break;
    // case 'MainSidebar':
    //     screen = require('app/components/sidebars/main').default;
    //     break;
    case Screens.MFA:
        screen = withIntl(require('@screens/mfa').default);
        break;
    case Screens.BROWSE_CHANNELS:
        screen = withServerDatabase(require('@screens/browse_channels').default);
        break;
    // case 'MoreDirectMessages':
    //     screen = require('@screens/more_dms').default;
    //     break;
    // case 'Notification':
    //     extraStyles = Platform.select({android: {flex: undefined, height: 100}});
    //     screen = require('@screens/notification/index.tsx').default;
    //     break;
    // case 'NotificationSettings':
    //     screen = require('@screens/settings/notification_settings').default;
    //     break;
    // case 'NotificationSettingsAutoResponder':
    //     screen = require('@screens/settings/notification_settings_auto_responder').default;
    //     break;
    // case 'NotificationSettingsEmail':
    //     screen = require('@screens/settings/notification_settings_email').default;
    //     break;
    // case 'NotificationSettingsMentions':
    //     screen = require('@screens/settings/notification_settings_mentions').default;
    //     break;
    // case 'NotificationSettingsMentionsKeywords':
    //     screen = require('@screens/settings/notification_settings_mentions_keywords').default;
    //     break;
    // case 'NotificationSettingsMobile':
    //     screen = require('@screens/settings/notification_settings_mobile').default;
    //     break;
    // case 'Permalink':
    //     screen = require('@screens/permalink').default;
    //     break;
    // case 'PinnedPosts':
    //     screen = require('@screens/pinned_posts').default;
    //     break;
    case Screens.POST_OPTIONS:
        screen = withServerDatabase(require('@screens/post_options').default);
        break;
    // case 'ReactionList':
    //     screen = require('@screens/reaction_list').default;
    //     break;
    // case 'RecentMentions':
    //     screen = require('@screens/recent_mentions').default;
    //     break;
    // case 'Search':
    //     screen = require('@screens/search').default;
    //     break;
    // case 'SelectorScreen':
    //     screen = require('@screens/selector_screen').default;
    //     break;
    // case 'SelectTeam':
    //     screen = require('@screens/select_team').default;
    //     break;
    // case 'SelectTimezone':
    //     screen = require('@screens/settings/timezone/select_timezone').default;
    //     break;
    // case 'Settings':
    //     screen = require('@screens/settings/general').default;
    //     break;
    // case 'SettingsSidebar':
    //     screen = require('app/components/sidebars/settings').default;
    //     break;
    // case 'SidebarSettings':
    //     screen = require('@screens/settings/sidebar').default;
    //     break;
        case Screens.SSO:
            screen = withIntl(require('@screens/sso').default);
            break;
    // case 'Table':
    //     screen = require('@screens/table').default;
    //     break;
    // case 'TermsOfService':
    //     screen = require('@screens/terms_of_service').default;
    //     break;
    // case 'ThemeSettings':
    //     screen = require('@screens/settings/theme').default;
    //     break;
    // case 'Thread':
    //     screen = require('@screens/thread').default;
    //     break;
    // case 'TimezoneSettings':
    //     screen = require('@screens/settings/timezone').default;
    //     break;
    // case 'UserProfile':
    //     screen = require('@screens/user_profile').default;
    //     break;
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
