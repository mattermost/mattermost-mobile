// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {Navigation} from 'react-native-navigation';

import Channel from 'app/screens/channel';
import Entry from 'app/screens/entry';
import SelectServer from 'app/screens/select_server';
import {wrapWithContextProvider} from 'app/utils/wrap_context_provider';

export function registerScreens(store, Provider) {
    Navigation.registerComponent('About', () => wrapWithContextProvider(require('app/screens/about').default), store, Provider);
    Navigation.registerComponent('AddReaction', () => wrapWithContextProvider(require('app/screens/add_reaction').default), store, Provider);
    Navigation.registerComponent('AdvancedSettings', () => wrapWithContextProvider(require('app/screens/settings/advanced_settings').default), store, Provider);
    Navigation.registerComponent('Channel', () => wrapWithContextProvider(Channel, false), store, Provider);
    Navigation.registerComponent('ChannelAddMembers', () => wrapWithContextProvider(require('app/screens/channel_add_members').default), store, Provider);
    Navigation.registerComponent('ChannelInfo', () => wrapWithContextProvider(require('app/screens/channel_info').default), store, Provider);
    Navigation.registerComponent('ChannelMembers', () => wrapWithContextProvider(require('app/screens/channel_members').default), store, Provider);
    Navigation.registerComponent('ChannelPeek', () => wrapWithContextProvider(require('app/screens/channel_peek').default), store, Provider);
    Navigation.registerComponent('ClientUpgrade', () => wrapWithContextProvider(require('app/screens/client_upgrade').default), store, Provider);
    Navigation.registerComponent('ClockDisplay', () => wrapWithContextProvider(require('app/screens/clock_display').default), store, Provider);
    Navigation.registerComponent('Code', () => wrapWithContextProvider(require('app/screens/code').default), store, Provider);
    Navigation.registerComponent('CreateChannel', () => wrapWithContextProvider(require('app/screens/create_channel').default), store, Provider);
    Navigation.registerComponent('DisplaySettings', () => wrapWithContextProvider(require('app/screens/settings/display_settings').default), store, Provider);
    Navigation.registerComponent('EditChannel', () => wrapWithContextProvider(require('app/screens/edit_channel').default), store, Provider);
    Navigation.registerComponent('EditPost', () => wrapWithContextProvider(require('app/screens/edit_post').default), store, Provider);
    Navigation.registerComponent('EditProfile', () => wrapWithContextProvider(require('app/screens/edit_profile').default), store, Provider);
    Navigation.registerComponent('Entry', () => Entry, store, Provider);
    Navigation.registerComponent('FlaggedPosts', () => wrapWithContextProvider(require('app/screens/flagged_posts').default), store, Provider);
    Navigation.registerComponent('ImagePreview', () => wrapWithContextProvider(require('app/screens/image_preview').default), store, Provider);
    Navigation.registerComponent('Login', () => wrapWithContextProvider(require('app/screens/login').default), store, Provider);
    Navigation.registerComponent('LoginOptions', () => wrapWithContextProvider(require('app/screens/login_options').default), store, Provider);
    Navigation.registerComponent('LongPost', () => wrapWithContextProvider(require('app/screens/long_post').default), store, Provider);
    Navigation.registerComponent('MFA', () => wrapWithContextProvider(require('app/screens/mfa').default), store, Provider);
    Navigation.registerComponent('MoreChannels', () => wrapWithContextProvider(require('app/screens/more_channels').default), store, Provider);
    Navigation.registerComponent('MoreDirectMessages', () => wrapWithContextProvider(require('app/screens/more_dms').default), store, Provider);
    Navigation.registerComponent('Notification', () => wrapWithContextProvider(require('app/screens/notification').default), store, Provider);
    Navigation.registerComponent('NotificationSettings', () => wrapWithContextProvider(require('app/screens/settings/notification_settings').default), store, Provider);
    Navigation.registerComponent('NotificationSettingsEmail', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_email').default), store, Provider);
    Navigation.registerComponent('NotificationSettingsMentions', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mentions').default), store, Provider);
    Navigation.registerComponent('NotificationSettingsMentionsKeywords', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mentions_keywords').default), store, Provider);
    Navigation.registerComponent('NotificationSettingsMobile', () => wrapWithContextProvider(require('app/screens/settings/notification_settings_mobile').default), store, Provider);
    Navigation.registerComponent('OptionsModal', () => wrapWithContextProvider(require('app/screens/options_modal').default), store, Provider);
    Navigation.registerComponent('Permalink', () => wrapWithContextProvider(require('app/screens/permalink').default), store, Provider);
    Navigation.registerComponent('RecentMentions', () => wrapWithContextProvider(require('app/screens/recent_mentions').default), store, Provider);
    Navigation.registerComponent('Root', () => require('app/screens/root').default, store, Provider);
    Navigation.registerComponent('Search', () => wrapWithContextProvider(require('app/screens/search').default), store, Provider);
    Navigation.registerComponent('SelectServer', () => wrapWithContextProvider(SelectServer), store, Provider);
    Navigation.registerComponent('SelectTeam', () => wrapWithContextProvider(require('app/screens/select_team').default), store, Provider);
    Navigation.registerComponent('Settings', () => wrapWithContextProvider(require('app/screens/settings/general').default), store, Provider);
    Navigation.registerComponent('SSO', () => wrapWithContextProvider(require('app/screens/sso').default), store, Provider);
    Navigation.registerComponent('Table', () => wrapWithContextProvider(require('app/screens/table').default), store, Provider);
    Navigation.registerComponent('TableImage', () => wrapWithContextProvider(require('app/screens/table_image').default), store, Provider);
    Navigation.registerComponent('TextPreview', () => wrapWithContextProvider(require('app/screens/text_preview').default), store, Provider);
    Navigation.registerComponent('Thread', () => wrapWithContextProvider(require('app/screens/thread').default), store, Provider);
    Navigation.registerComponent('UserProfile', () => wrapWithContextProvider(require('app/screens/user_profile').default), store, Provider);
}
