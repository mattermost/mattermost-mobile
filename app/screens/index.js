// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';

import Channel from 'app/screens/channel';
import Root from 'app/components/root';
import SelectServer from 'app/screens/select_server';

export function registerScreens(store, Provider) {
    // TODO consolidate this with app/utils/wrap_context_provider
    const wrapper = (Comp) => (props) => ( // eslint-disable-line react/display-name
        <Provider store={store}>
            <Root>
                <Comp {...props}/>
            </Root>
        </Provider>
    );

    Navigation.registerComponent('About', () => wrapper(require('app/screens/about').default), () => require('app/screens/about').default);
    Navigation.registerComponent('AddReaction', () => wrapper(require('app/screens/add_reaction').default), () => require('app/screens/add_reaction').default);
    Navigation.registerComponent('AdvancedSettings', () => wrapper(require('app/screens/settings/advanced_settings').default), () => require('app/screens/settings/advanced_settings').default);
    Navigation.registerComponent('Channel', () => wrapper(Channel), () => Channel);
    Navigation.registerComponent('ChannelAddMembers', () => wrapper(require('app/screens/channel_add_members').default), () => require('app/screens/channel_add_members').default);
    Navigation.registerComponent('ChannelInfo', () => wrapper(require('app/screens/channel_info').default), () => require('app/screens/channel_info').default);
    Navigation.registerComponent('ChannelMembers', () => wrapper(require('app/screens/channel_members').default), () => require('app/screens/channel_members').default);
    Navigation.registerComponent('ChannelPeek', () => wrapper(require('app/screens/channel_peek').default), () => require('app/screens/channel_peek').default);
    Navigation.registerComponent('ClientUpgrade', () => wrapper(require('app/screens/client_upgrade').default), () => require('app/screens/client_upgrade').default);
    Navigation.registerComponent('ClockDisplaySettings', () => wrapper(require('app/screens/settings/clock_display').default), () => require('app/screens/settings/clock_display').default);
    Navigation.registerComponent('Code', () => wrapper(require('app/screens/code').default), () => require('app/screens/code').default);
    Navigation.registerComponent('CreateChannel', () => wrapper(require('app/screens/create_channel').default), () => require('app/screens/create_channel').default);
    Navigation.registerComponent('DisplaySettings', () => wrapper(require('app/screens/settings/display_settings').default), () => require('app/screens/settings/display_settings').default);
    Navigation.registerComponent('EditChannel', () => wrapper(require('app/screens/edit_channel').default), () => require('app/screens/edit_channel').default);
    Navigation.registerComponent('EditPost', () => wrapper(require('app/screens/edit_post').default), () => require('app/screens/edit_post').default);
    Navigation.registerComponent('EditProfile', () => wrapper(require('app/screens/edit_profile').default), () => require('app/screens/edit_profile').default);
    Navigation.registerComponent('ExpandedAnnouncementBanner', () => wrapper(require('app/screens/expanded_announcement_banner').default), () => require('app/screens/expanded_announcement_banner').default);
    Navigation.registerComponent('FlaggedPosts', () => wrapper(require('app/screens/flagged_posts').default), () => require('app/screens/flagged_posts').default);
    Navigation.registerComponent('ForgotPassword', () => wrapper(require('app/screens/forgot_password').default), () => require('app/screens/forgot_password').default);
    Navigation.registerComponent('ImagePreview', () => wrapper(require('app/screens/image_preview').default), () => require('app/screens/image_preview').default);
    Navigation.registerComponent('InteractiveDialog', () => wrapper(require('app/screens/interactive_dialog').default), () => require('app/screens/interactive_dialog').default);
    Navigation.registerComponent('Login', () => wrapper(require('app/screens/login').default), () => require('app/screens/login').default);
    Navigation.registerComponent('LoginOptions', () => wrapper(require('app/screens/login_options').default), () => require('app/screens/login_options').default);
    Navigation.registerComponent('LongPost', () => wrapper(require('app/screens/long_post').default), () => require('app/screens/long_post').default);
    Navigation.registerComponent('MFA', () => wrapper(require('app/screens/mfa').default), () => require('app/screens/mfa').default);
    Navigation.registerComponent('MoreChannels', () => wrapper(require('app/screens/more_channels').default), () => require('app/screens/more_channels').default);
    Navigation.registerComponent('MoreDirectMessages', () => wrapper(require('app/screens/more_dms').default), () => require('app/screens/more_dms').default);
    Navigation.registerComponent('Notification', () => wrapper(require('app/screens/notification').default), () => require('app/screens/notification').default);
    Navigation.registerComponent('NotificationSettings', () => wrapper(require('app/screens/settings/notification_settings').default), () => require('app/screens/settings/notification_settings').default);
    Navigation.registerComponent('NotificationSettingsAutoResponder', () => wrapper(require('app/screens/settings/notification_settings_auto_responder').default), () => require('app/screens/settings/notification_settings_auto_responder').default);
    Navigation.registerComponent('NotificationSettingsEmail', () => wrapper(require('app/screens/settings/notification_settings_email').default), () => require('app/screens/settings/notification_settings_email').default);
    Navigation.registerComponent('NotificationSettingsMentions', () => wrapper(require('app/screens/settings/notification_settings_mentions').default), () => require('app/screens/settings/notification_settings_mentions').default);
    Navigation.registerComponent('NotificationSettingsMentionsKeywords', () => wrapper(require('app/screens/settings/notification_settings_mentions_keywords').default), () => require('app/screens/settings/notification_settings_mentions_keywords').default);
    Navigation.registerComponent('NotificationSettingsMobile', () => wrapper(require('app/screens/settings/notification_settings_mobile').default), () => require('app/screens/settings/notification_settings_mobile').default);
    Navigation.registerComponent('OptionsModal', () => wrapper(require('app/screens/options_modal').default), () => require('app/screens/options_modal').default);
    Navigation.registerComponent('Permalink', () => wrapper(require('app/screens/permalink').default), () => require('app/screens/permalink').default);
    Navigation.registerComponent('PinnedPosts', () => wrapper(require('app/screens/pinned_posts').default), () => require('app/screens/pinned_posts').default);
    Navigation.registerComponent('PostOptions', () => gestureHandlerRootHOC(wrapper(require('app/screens/post_options').default)), () => require('app/screens/post_options').default);
    Navigation.registerComponent('ReactionList', () => gestureHandlerRootHOC(wrapper(require('app/screens/reaction_list').default)), () => require('app/screens/reaction_list').default);
    Navigation.registerComponent('RecentMentions', () => wrapper(require('app/screens/recent_mentions').default), () => require('app/screens/recent_mentions').default);
    Navigation.registerComponent('Root', () => wrapper(Root), () => Root);
    Navigation.registerComponent('Search', () => wrapper(require('app/screens/search').default), () => require('app/screens/search').default);
    Navigation.registerComponent('SelectorScreen', () => wrapper(require('app/screens/selector_screen').default), () => require('app/screens/selector_screen').default);
    Navigation.registerComponent('SelectServer', () => wrapper(SelectServer), () => SelectServer);
    Navigation.registerComponent('SelectTeam', () => wrapper(require('app/screens/select_team').default), () => require('app/screens/select_team').default);
    Navigation.registerComponent('SelectTimezone', () => wrapper(require('app/screens/settings/timezone/select_timezone').default), () => require('app/screens/settings/timezone/select_timezone').default);
    Navigation.registerComponent('Settings', () => wrapper(require('app/screens/settings/general').default), () => require('app/screens/settings/general').default);
    Navigation.registerComponent('SidebarSettings', () => wrapper(require('app/screens/settings/sidebar').default), () => require('app/screens/settings/sidebar').default);
    Navigation.registerComponent('SSO', () => wrapper(require('app/screens/sso').default), () => require('app/screens/sso').default);
    Navigation.registerComponent('Table', () => wrapper(require('app/screens/table').default), () => require('app/screens/table').default);
    Navigation.registerComponent('TableImage', () => wrapper(require('app/screens/table_image').default), () => require('app/screens/table_image').default);
    Navigation.registerComponent('TermsOfService', () => wrapper(require('app/screens/terms_of_service').default), () => require('app/screens/terms_of_service').default);
    Navigation.registerComponent('TextPreview', () => wrapper(require('app/screens/text_preview').default), () => require('app/screens/text_preview').default);
    Navigation.registerComponent('ThemeSettings', () => wrapper(require('app/screens/settings/theme').default), () => require('app/screens/settings/theme').default);
    Navigation.registerComponent('Thread', () => wrapper(require('app/screens/thread').default), () => require('app/screens/thread').default);
    Navigation.registerComponent('TimezoneSettings', () => wrapper(require('app/screens/settings/timezone').default), () => require('app/screens/settings/timezone').default);
    Navigation.registerComponent('ErrorTeamsList', () => wrapper(require('app/screens/error_teams_list').default), () => require('app/screens/error_teams_list').default);
    Navigation.registerComponent('UserProfile', () => wrapper(require('app/screens/user_profile').default), () => require('app/screens/user_profile').default);
}
