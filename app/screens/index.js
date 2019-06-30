// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';

import Channel from './channel';
import SelectServer from './select_server';
import ScreenWrapper from './screen_wrapper';

export function registerScreens(store, exludeEvents = true) {
    const wrapWithContextProvider = (Component) => (props) => { //eslint-disable-line react/display-name
        const {navigator} = props; //eslint-disable-line react/prop-types

        return (
            <ScreenWrapper
                exludeEvents={exludeEvents}
                store={store}
                navigator={navigator}
            >
                <Component {...props}/>
            </ScreenWrapper>
        );
    };

    // TODO: Bring back the About screen and delete the test screen
    Navigation.registerComponent('About', () => wrapWithContextProvider(require('app/screens/test').default, store));
    Navigation.registerComponent('AddReaction', () => wrapWithContextProvider(require('app/screens/add_reaction').default, store));
    Navigation.registerComponent('AdvancedSettings', () => wrapWithContextProvider(require('app/screens/settings/advanced_settings').default, store));
    Navigation.registerComponent('Channel', () => wrapWithContextProvider(Channel, store, false));
    Navigation.registerComponent('ChannelAddMembers', () => wrapWithContextProvider(require('app/screens/channel_add_members').default, store));
    Navigation.registerComponent('ChannelInfo', () => wrapWithContextProvider(require('app/screens/channel_info').default, store));
    Navigation.registerComponent('ChannelMembers', () => wrapWithContextProvider(require('app/screens/channel_members').default, store));
    Navigation.registerComponent('ChannelPeek', () => wrapWithContextProvider(require('app/screens/channel_peek').default, store));
    Navigation.registerComponent('ClientUpgrade', () => wrapWithContextProvider(require('app/screens/client_upgrade').default, store));
    Navigation.registerComponent('ClockDisplay', () => wrapWithContextProvider(require('app/screens/clock_display').default, store));
    Navigation.registerComponent('Code', () => wrapWithContextProvider(require('app/screens/code').default, store));
    Navigation.registerComponent('CreateChannel', () => wrapWithContextProvider(require('app/screens/create_channel').default, store));
    Navigation.registerComponent('DisplaySettings', () => wrapWithContextProvider(require('app/screens/settings/display_settings').default, store));
    Navigation.registerComponent('EditChannel', () => wrapWithContextProvider(require('app/screens/edit_channel').default, store));
    Navigation.registerComponent('EditPost', () => wrapWithContextProvider(require('app/screens/edit_post').default, store));
    Navigation.registerComponent('EditProfile', () => wrapWithContextProvider(require('app/screens/edit_profile').default, store));
    Navigation.registerComponent('ExpandedAnnouncementBanner', () => wrapWithContextProvider(require('app/screens/expanded_announcement_banner').default, store));
    Navigation.registerComponent('FlaggedPosts', () => wrapWithContextProvider(require('app/screens/flagged_posts').default, store));
    Navigation.registerComponent('ForgotPassword', () => wrapWithContextProvider(require('app/screens/forgot_password').default, store));
    Navigation.registerComponent('ImagePreview', () => wrapWithContextProvider(require('app/screens/image_preview').default, store));
    Navigation.registerComponent('InteractiveDialog', () => wrapWithContextProvider(require('app/screens/interactive_dialog').default, store));
    Navigation.registerComponent('Login', () => wrapWithContextProvider(require('app/screens/login').default, store));
    Navigation.registerComponent('LoginOptions', () => wrapWithContextProvider(require('app/screens/login_options').default, store));
    Navigation.registerComponent('LongPost', () => wrapWithContextProvider(require('app/screens/long_post').default, store));
    Navigation.registerComponent('MFA', () => wrapWithContextProvider(require('app/screens/mfa').default, store));
    Navigation.registerComponent('MoreChannels', () => wrapWithContextProvider(require('app/screens/more_channels').default, store));
    Navigation.registerComponent('MoreDirectMessages', () => wrapWithContextProvider(require('app/screens/more_dms').default, store));
    Navigation.registerComponent('Notification', () => wrapWithContextProvider(require('app/screens/notification').default, store));
    Navigation.registerComponent('NotificationSettings', () => wrapWithContextProvider(require('app/screens/settings/notification_settings').default, store));
    Navigation.registerComponent('NotificationSettingsAutoResponder', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_auto_responder').default, store));
    Navigation.registerComponent('NotificationSettingsEmail', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_email').default, store));
    Navigation.registerComponent('NotificationSettingsMentions', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mentions').default, store));
    Navigation.registerComponent('NotificationSettingsMentionsKeywords', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mentions_keywords').default, store));
    Navigation.registerComponent('NotificationSettingsMobile', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mobile').default, store));
    Navigation.registerComponent('OptionsModal', () => wrapWithContextProvider(require('app/screens/options_modal').default, store));
    Navigation.registerComponent('Permalink', () => wrapWithContextProvider(require('app/screens/permalink').default, store));
    Navigation.registerComponent('PinnedPosts', () => wrapWithContextProvider(require('app/screens/pinned_posts').default, store));
    Navigation.registerComponent('PostOptions', () => gestureHandlerRootHOC(wrapWithContextProvider(require('app/screens/post_options').default, store)));
    Navigation.registerComponent('ReactionList', () => gestureHandlerRootHOC(wrapWithContextProvider(require('app/screens/reaction_list').default, store)));
    Navigation.registerComponent('RecentMentions', () => wrapWithContextProvider(require('app/screens/recent_mentions').default, store));
    Navigation.registerComponent('Search', () => wrapWithContextProvider(require('app/screens/search').default, store));
    Navigation.registerComponent('SelectorScreen', () => wrapWithContextProvider(require('app/screens/selector_screen').default, store));
    Navigation.registerComponent('SelectServer', () => wrapWithContextProvider(SelectServer));
    Navigation.registerComponent('SelectTeam', () => wrapWithContextProvider(require('app/screens/select_team').default, store));
    Navigation.registerComponent('SelectTimezone', () => wrapWithContextProvider(require('app/screens/timezone/select_timezone').default, store));
    Navigation.registerComponent('Settings', () => wrapWithContextProvider(require('app/screens/settings/general').default, store));
    Navigation.registerComponent('SSO', () => wrapWithContextProvider(require('app/screens/sso').default, store));
    Navigation.registerComponent('Table', () => wrapWithContextProvider(require('app/screens/table').default, store));
    Navigation.registerComponent('TableImage', () => wrapWithContextProvider(require('app/screens/table_image').default, store));
    Navigation.registerComponent('TermsOfService', () => wrapWithContextProvider(require('app/screens/terms_of_service').default, store));
    Navigation.registerComponent('TextPreview', () => wrapWithContextProvider(require('app/screens/text_preview').default, store));
    Navigation.registerComponent('ThemeSettings', () => wrapWithContextProvider(require('app/screens/theme').default, store));
    Navigation.registerComponent('Thread', () => wrapWithContextProvider(require('app/screens/thread').default, store));
    Navigation.registerComponent('TimezoneSettings', () => wrapWithContextProvider(require('app/screens/timezone').default, store));
    Navigation.registerComponent('ErrorTeamsList', () => wrapWithContextProvider(require('app/screens/error_teams_list').default, store));
    Navigation.registerComponent('UserProfile', () => wrapWithContextProvider(require('app/screens/user_profile').default, store));
}
