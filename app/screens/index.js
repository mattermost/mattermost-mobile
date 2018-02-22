// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';

import IntlWrapper from 'app/components/root';

function wrapWithContextProvider(Comp, excludeEvents = true) {
    return (props) => { //eslint-disable-line react/display-name
        const {navigator} = props; //eslint-disable-line react/prop-types
        return (
            <IntlWrapper
                navigator={navigator}
                excludeEvents={excludeEvents}
            >
                <Comp {...props}/>
            </IntlWrapper>
        );
    };
}

function lazyLoad(name, store, provider, excludeEvents = true) {
    return wrapWithContextProvider(require(name).default, excludeEvents, store, provider); //eslint-disable-line global-require
}

export function registerScreens(store, Provider) {
    Navigation.registerComponent('About', () => lazyLoad('app/screens/about', store, Provider));
    Navigation.registerComponent('AddReaction', () => lazyLoad('app/screens/add_reaction', store, Provider));
    Navigation.registerComponent('AdvancedSettings', () => lazyLoad('app/screens/settings/advanced_settings', store, Provider));
    Navigation.registerComponent('Channel', () => lazyLoad('app/screens/channel', store, Provider, false));
    Navigation.registerComponent('ChannelAddMembers', () => lazyLoad('app/screens/channel_add_members', store, Provider));
    Navigation.registerComponent('ChannelInfo', () => lazyLoad('app/screens/channel_info', store, Provider));
    Navigation.registerComponent('ChannelMembers', () => lazyLoad('app/screens/channel_members', store, Provider));
    Navigation.registerComponent('ChannelPeek', () => lazyLoad('app/screens/channel_peek', store, Provider));
    Navigation.registerComponent('ClientUpgrade', () => lazyLoad('app/screens/client_upgrade', store, Provider));
    Navigation.registerComponent('ClockDisplay', () => lazyLoad('app/screens/clock_display', store, Provider));
    Navigation.registerComponent('Code', () => lazyLoad('app/screens/code', store, Provider));
    Navigation.registerComponent('CreateChannel', () => lazyLoad('app/screens/create_channel', store, Provider));
    Navigation.registerComponent('DisplaySettings', () => lazyLoad('app/screens/settings/display_settings', store, Provider));
    Navigation.registerComponent('EditChannel', () => lazyLoad('app/screens/edit_channel', store, Provider));
    Navigation.registerComponent('EditPost', () => lazyLoad('app/screens/edit_post', store, Provider));
    Navigation.registerComponent('EditProfile', () => lazyLoad('app/screens/edit_profile', store, Provider));
    Navigation.registerComponent('ImagePreview', () => lazyLoad('app/screens/image_preview', store, Provider));
    Navigation.registerComponent('Login', () => lazyLoad('app/screens/login', store, Provider));
    Navigation.registerComponent('LoginOptions', () => lazyLoad('app/screens/login_options', store, Provider));
    Navigation.registerComponent('MFA', () => lazyLoad('app/screens/mfa', store, Provider));
    Navigation.registerComponent('MoreChannels', () => lazyLoad('app/screens/more_channels', store, Provider));
    Navigation.registerComponent('MoreDirectMessages', () => lazyLoad('app/screens/more_dms', store, Provider));
    Navigation.registerComponent('Notification', () => lazyLoad('app/screens/notification', store, Provider));
    Navigation.registerComponent('NotificationSettings', () => lazyLoad('app/screens/settings/notification_settings', store, Provider));
    Navigation.registerComponent('NotificationSettingsEmail', () => lazyLoad('app/screens/settings/notification_settings_email', store, Provider));
    Navigation.registerComponent('NotificationSettingsMentions', () => lazyLoad('app/screens/settings/notification_settings_mentions', store, Provider));
    Navigation.registerComponent('NotificationSettingsMentionsKeywords', () => lazyLoad('app/screens/settings/notification_settings_mentions_keywords', store, Provider));
    Navigation.registerComponent('NotificationSettingsMobile', () => lazyLoad('app/screens/settings/notification_settings_mobile', store, Provider));
    Navigation.registerComponent('OptionsModal', () => lazyLoad('app/screens/options_modal', store, Provider));
    Navigation.registerComponent('Root', () => lazyLoad('app/screens/root', store, Provider));
    Navigation.registerComponent('Search', () => lazyLoad('app/screens/search', store, Provider));
    Navigation.registerComponent('SelectServer', () => lazyLoad('app/screens/select_server', store, Provider));
    Navigation.registerComponent('SelectTeam', () => lazyLoad('app/screens/select_team', store, Provider));
    Navigation.registerComponent('Settings', () => lazyLoad('app/screens/settings/general', store, Provider));
    Navigation.registerComponent('SSO', () => lazyLoad('app/screens/sso', store, Provider));
    Navigation.registerComponent('Table', () => lazyLoad('app/screens/table', store, Provider));
    Navigation.registerComponent('TableImage', () => lazyLoad('app/screens/table_image', store, Provider));
    Navigation.registerComponent('Thread', () => lazyLoad('app/screens/thread', store, Provider));
    Navigation.registerComponent('UserProfile', () => lazyLoad('app/screens/user_profile', store, Provider));
}
