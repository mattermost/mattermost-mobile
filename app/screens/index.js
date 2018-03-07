// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';

import About from 'app/screens/about';

import AddReaction from 'app/screens/add_reaction';
import AdvancedSettings from 'app/screens/settings/advanced_settings';
import Channel from 'app/screens/channel';
import ChannelAddMembers from 'app/screens/channel_add_members';
import ChannelInfo from 'app/screens/channel_info';
import ChannelMembers from 'app/screens/channel_members';
import ChannelPeek from 'app/screens/channel_peek';
import ClientUpgrade from 'app/screens/client_upgrade';
import ClockDisplay from 'app/screens/clock_display';
import Code from 'app/screens/code';
import CreateChannel from 'app/screens/create_channel';
import DisplaySettings from 'app/screens/settings/display_settings';
import EditChannel from 'app/screens/edit_channel';
import EditPost from 'app/screens/edit_post';
import EditProfile from 'app/screens/edit_profile';
import ImagePreview from 'app/screens/image_preview';
import TextPreview from 'app/screens/text_preview';
import Login from 'app/screens/login';
import LoginOptions from 'app/screens/login_options';
import Mfa from 'app/screens/mfa';
import MoreChannels from 'app/screens/more_channels';
import MoreDirectMessages from 'app/screens/more_dms';
import Notification from 'app/screens/notification';
import NotificationSettings from 'app/screens/settings/notification_settings';
import NotificationSettingsEmail from 'app/screens/settings/notification_settings_email';
import NotificationSettingsMentions from 'app/screens/settings/notification_settings_mentions';
import NotificationSettingsMentionsKeywords from 'app/screens/settings/notification_settings_mentions_keywords';
import NotificationSettingsMobile from 'app/screens/settings/notification_settings_mobile';
import OptionsModal from 'app/screens/options_modal';
import Permalink from 'app/screens/permalink';
import Root from 'app/screens/root';
import SSO from 'app/screens/sso';
import Search from 'app/screens/search';
import SelectServer from 'app/screens/select_server';
import SelectTeam from 'app/screens/select_team';
import Settings from 'app/screens/settings/general';
import Table from 'app/screens/table';
import TableImage from 'app/screens/table_image';
import Thread from 'app/screens/thread';
import UserProfile from 'app/screens/user_profile';

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

export function registerScreens(store, Provider) {
    Navigation.registerComponent('About', () => wrapWithContextProvider(About), store, Provider);
    Navigation.registerComponent('AddReaction', () => wrapWithContextProvider(AddReaction), store, Provider);
    Navigation.registerComponent('AdvancedSettings', () => wrapWithContextProvider(AdvancedSettings), store, Provider);
    Navigation.registerComponent('Channel', () => wrapWithContextProvider(Channel, false), store, Provider);
    Navigation.registerComponent('ChannelAddMembers', () => wrapWithContextProvider(ChannelAddMembers), store, Provider);
    Navigation.registerComponent('ChannelInfo', () => wrapWithContextProvider(ChannelInfo), store, Provider);
    Navigation.registerComponent('ChannelMembers', () => wrapWithContextProvider(ChannelMembers), store, Provider);
    Navigation.registerComponent('ChannelPeek', () => wrapWithContextProvider(ChannelPeek), store, Provider);
    Navigation.registerComponent('ClientUpgrade', () => wrapWithContextProvider(ClientUpgrade), store, Provider);
    Navigation.registerComponent('ClockDisplay', () => wrapWithContextProvider(ClockDisplay), store, Provider);
    Navigation.registerComponent('Code', () => wrapWithContextProvider(Code), store, Provider);
    Navigation.registerComponent('CreateChannel', () => wrapWithContextProvider(CreateChannel), store, Provider);
    Navigation.registerComponent('DisplaySettings', () => wrapWithContextProvider(DisplaySettings), store, Provider);
    Navigation.registerComponent('EditChannel', () => wrapWithContextProvider(EditChannel), store, Provider);
    Navigation.registerComponent('EditPost', () => wrapWithContextProvider(EditPost), store, Provider);
    Navigation.registerComponent('EditProfile', () => wrapWithContextProvider(EditProfile), store, Provider);
    Navigation.registerComponent('ImagePreview', () => wrapWithContextProvider(ImagePreview), store, Provider);
    Navigation.registerComponent('TextPreview', () => wrapWithContextProvider(TextPreview), store, Provider);
    Navigation.registerComponent('Login', () => wrapWithContextProvider(Login), store, Provider);
    Navigation.registerComponent('LoginOptions', () => wrapWithContextProvider(LoginOptions), store, Provider);
    Navigation.registerComponent('MFA', () => wrapWithContextProvider(Mfa), store, Provider);
    Navigation.registerComponent('MoreChannels', () => wrapWithContextProvider(MoreChannels), store, Provider);
    Navigation.registerComponent('MoreDirectMessages', () => wrapWithContextProvider(MoreDirectMessages), store, Provider);
    Navigation.registerComponent('Notification', () => wrapWithContextProvider(Notification), store, Provider);
    Navigation.registerComponent('NotificationSettings', () => wrapWithContextProvider(NotificationSettings), store, Provider);
    Navigation.registerComponent('NotificationSettingsEmail', () => wrapWithContextProvider(NotificationSettingsEmail), store, Provider);
    Navigation.registerComponent('NotificationSettingsMentions', () => wrapWithContextProvider(NotificationSettingsMentions), store, Provider);
    Navigation.registerComponent('NotificationSettingsMentionsKeywords', () => wrapWithContextProvider(NotificationSettingsMentionsKeywords), store, Provider);
    Navigation.registerComponent('NotificationSettingsMobile', () => wrapWithContextProvider(NotificationSettingsMobile), store, Provider);
    Navigation.registerComponent('OptionsModal', () => wrapWithContextProvider(OptionsModal), store, Provider);
    Navigation.registerComponent('Permalink', () => wrapWithContextProvider(Permalink), store, Provider);
    Navigation.registerComponent('Root', () => Root, store, Provider);
    Navigation.registerComponent('Search', () => wrapWithContextProvider(Search), store, Provider);
    Navigation.registerComponent('SelectServer', () => wrapWithContextProvider(SelectServer), store, Provider);
    Navigation.registerComponent('SelectTeam', () => wrapWithContextProvider(SelectTeam), store, Provider);
    Navigation.registerComponent('Settings', () => wrapWithContextProvider(Settings), store, Provider);
    Navigation.registerComponent('SSO', () => wrapWithContextProvider(SSO), store, Provider);
    Navigation.registerComponent('Table', () => wrapWithContextProvider(Table), store, Provider);
    Navigation.registerComponent('TableImage', () => wrapWithContextProvider(TableImage), store, Provider);
    Navigation.registerComponent('Thread', () => wrapWithContextProvider(Thread), store, Provider);
    Navigation.registerComponent('UserProfile', () => wrapWithContextProvider(UserProfile), store, Provider);
}
