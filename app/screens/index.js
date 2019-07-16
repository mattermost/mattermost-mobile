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
        return (
            <ScreenWrapper
                exludeEvents={exludeEvents}
                store={store}
            >
                <Component {...props}/>
            </ScreenWrapper>
        );
    };

    // TODO: Bring back the About screen and delete the test screen
    Navigation.registerComponent('About', () => wrapWithContextProvider(require('app/screens/about').default), () => require('app/screens/about').default);
    Navigation.registerComponent('AddReaction', () => wrapWithContextProvider(require('app/screens/add_reaction').default), () => require('app/screens/add_reaction').default);
    Navigation.registerComponent('AdvancedSettings', () => wrapWithContextProvider(require('app/screens/settings/advanced_settings').default), () => require('app/screens/settings/advanced_settings').default);
    Navigation.registerComponent('Channel', () => wrapWithContextProvider(Channel), () => Channel);
    Navigation.registerComponent('ChannelAddMembers', () => wrapWithContextProvider(require('app/screens/channel_add_members').default), () => require('app/screens/channel_add_members').default);
    Navigation.registerComponent('ChannelInfo', () => wrapWithContextProvider(require('app/screens/channel_info').default), () => require('app/screens/channel_info').default);
    Navigation.registerComponent('ChannelMembers', () => wrapWithContextProvider(require('app/screens/channel_members').default), () => require('app/screens/channel_members').default);
    Navigation.registerComponent('ChannelPeek', () => wrapWithContextProvider(require('app/screens/channel_peek').default), () => require('app/screens/channel_peek').default);
    Navigation.registerComponent('ClientUpgrade', () => wrapWithContextProvider(require('app/screens/client_upgrade').default), () => require('app/screens/client_upgrade').default);
    Navigation.registerComponent('ClockDisplay', () => wrapWithContextProvider(require('app/screens/clock_display').default), () => require('app/screens/clock_display').default);
    Navigation.registerComponent('Code', () => wrapWithContextProvider(require('app/screens/code').default), () => require('app/screens/code').default);
    Navigation.registerComponent('CreateChannel', () => wrapWithContextProvider(require('app/screens/create_channel').default), () => require('app/screens/create_channel').default);
    Navigation.registerComponent('DisplaySettings', () => wrapWithContextProvider(require('app/screens/settings/display_settings').default), () => require('app/screens/settings/display_settings').default);
    Navigation.registerComponent('EditChannel', () => wrapWithContextProvider(require('app/screens/edit_channel').default), () => require('app/screens/edit_channel').default);
    Navigation.registerComponent('EditPost', () => wrapWithContextProvider(require('app/screens/edit_post').default), () => require('app/screens/edit_post').default);
    Navigation.registerComponent('EditProfile', () => wrapWithContextProvider(require('app/screens/edit_profile').default), () => require('app/screens/edit_profile').default);
    Navigation.registerComponent('ExpandedAnnouncementBanner', () => wrapWithContextProvider(require('app/screens/expanded_announcement_banner').default), () => require('app/screens/expanded_announcement_banner').default);
    Navigation.registerComponent('FlaggedPosts', () => wrapWithContextProvider(require('app/screens/flagged_posts').default), () => require('app/screens/flagged_posts').default);
    Navigation.registerComponent('ForgotPassword', () => wrapWithContextProvider(require('app/screens/forgot_password').default), () => require('app/screens/forgot_password').default);
    Navigation.registerComponent('ImagePreview', () => wrapWithContextProvider(require('app/screens/image_preview').default), () => require('app/screens/image_preview').default);
    Navigation.registerComponent('InteractiveDialog', () => wrapWithContextProvider(require('app/screens/interactive_dialog').default), () => require('app/screens/interactive_dialog').default);
    Navigation.registerComponent('Login', () => wrapWithContextProvider(require('app/screens/login').default), () => require('app/screens/login').default);
    Navigation.registerComponent('LoginOptions', () => wrapWithContextProvider(require('app/screens/login_options').default), () => require('app/screens/login_options').default);
    Navigation.registerComponent('LongPost', () => wrapWithContextProvider(require('app/screens/long_post').default), () => require('app/screens/long_post').default);
    Navigation.registerComponent('MFA', () => wrapWithContextProvider(require('app/screens/mfa').default), () => require('app/screens/mfa').default);
    Navigation.registerComponent('MoreChannels', () => wrapWithContextProvider(require('app/screens/more_channels').default), () => require('app/screens/more_channels').default);
    Navigation.registerComponent('MoreDirectMessages', () => wrapWithContextProvider(require('app/screens/more_dms').default), () => require('app/screens/more_dms').default);
    Navigation.registerComponent('Notification', () => wrapWithContextProvider(require('app/screens/notification').default), () => require('app/screens/notification').default);
    Navigation.registerComponent('NotificationSettings', () => wrapWithContextProvider(require('app/screens/settings/notification_settings').default), () => require('app/screens/settings/notification_settings').default);
    Navigation.registerComponent('NotificationSettingsAutoResponder', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_auto_responder').default), () => require('app/screens/settings/notification_settings_auto_responder').default);
    Navigation.registerComponent('NotificationSettingsEmail', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_email').default), () => require('app/screens/settings/notification_settings_email').default);
    Navigation.registerComponent('NotificationSettingsMentions', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mentions').default), () => require('app/screens/settings/notification_settings_mentions').default);
    Navigation.registerComponent('NotificationSettingsMentionsKeywords', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mentions_keywords').default), () => require('app/screens/settings/notification_settings_mentions_keywords').default);
    Navigation.registerComponent('NotificationSettingsMobile', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mobile').default), () => require('app/screens/settings/notification_settings_mobile').default);
    Navigation.registerComponent('OptionsModal', () => wrapWithContextProvider(require('app/screens/options_modal').default), () => require('app/screens/options_modal').default);
    Navigation.registerComponent('Permalink', () => wrapWithContextProvider(require('app/screens/permalink').default), () => require('app/screens/permalink').default);
    Navigation.registerComponent('PinnedPosts', () => wrapWithContextProvider(require('app/screens/pinned_posts').default), () => require('app/screens/pinned_posts').default);
    Navigation.registerComponent('PostOptions', () => gestureHandlerRootHOC(wrapWithContextProvider(require('app/screens/post_options').default)), () => require('app/screens/post_options').default);
    Navigation.registerComponent('ReactionList', () => gestureHandlerRootHOC(wrapWithContextProvider(require('app/screens/reaction_list').default)), () => require('app/screens/reaction_list').default);
    Navigation.registerComponent('RecentMentions', () => wrapWithContextProvider(require('app/screens/recent_mentions').default), () => require('app/screens/recent_mentions').default);
    Navigation.registerComponent('Search', () => wrapWithContextProvider(require('app/screens/search').default), () => require('app/screens/search').default);
    Navigation.registerComponent('SelectorScreen', () => wrapWithContextProvider(require('app/screens/selector_screen').default), () => require('app/screens/selector_screen').default);
    Navigation.registerComponent('SelectServer', () => wrapWithContextProvider(SelectServer), () => SelectServer);
    Navigation.registerComponent('SelectTeam', () => wrapWithContextProvider(require('app/screens/select_team').default), () => require('app/screens/select_team').default);
    Navigation.registerComponent('SelectTimezone', () => wrapWithContextProvider(require('app/screens/timezone/select_timezone').default), () => require('app/screens/timezone/select_timezone').default);
    Navigation.registerComponent('Settings', () => wrapWithContextProvider(require('app/screens/settings/general').default), () => require('app/screens/settings/general').default);
    Navigation.registerComponent('SSO', () => wrapWithContextProvider(require('app/screens/sso').default), () => require('app/screens/sso').default);
    Navigation.registerComponent('Table', () => wrapWithContextProvider(require('app/screens/table').default), () => require('app/screens/table').default);
    Navigation.registerComponent('TableImage', () => wrapWithContextProvider(require('app/screens/table_image').default), () => require('app/screens/table_image').default);
    Navigation.registerComponent('TermsOfService', () => wrapWithContextProvider(require('app/screens/terms_of_service').default), () => require('app/screens/terms_of_service').default);
    Navigation.registerComponent('TextPreview', () => wrapWithContextProvider(require('app/screens/text_preview').default), () => require('app/screens/text_preview').default);
    Navigation.registerComponent('ThemeSettings', () => wrapWithContextProvider(require('app/screens/theme').default), () => require('app/screens/theme').default);
    Navigation.registerComponent('Thread', () => wrapWithContextProvider(require('app/screens/thread').default), () => require('app/screens/thread').default);
    Navigation.registerComponent('TimezoneSettings', () => wrapWithContextProvider(require('app/screens/timezone').default), () => require('app/screens/timezone').default);
    Navigation.registerComponent('ErrorTeamsList', () => wrapWithContextProvider(require('app/screens/error_teams_list').default), () => require('app/screens/error_teams_list').default);
    Navigation.registerComponent('UserProfile', () => wrapWithContextProvider(require('app/screens/user_profile').default), () => require('app/screens/user_profile').default);
}
