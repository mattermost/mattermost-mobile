// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';

import About from 'app/screens/about';
import AccountSettings from 'app/screens/account_settings';
import AccountNotifications from 'app/screens/account_notifications';
import Channel from 'app/screens/channel';
import ChannelAddMembers from 'app/screens/channel_add_members';
import ChannelInfo from 'app/screens/channel_info';
import ChannelMembers from 'app/screens/channel_members';
import CreateChannel from 'app/screens/create_channel';
import EditPost from 'app/screens/edit_post';
import ImagePreview from 'app/screens/image_preview';
import LoadTeam from 'app/screens/load_team';
import Login from 'app/screens/login';
import LoginOptions from 'app/screens/login_options';
import Mfa from 'app/screens/mfa';
import MoreChannels from 'app/screens/more_channels';
import MoreDirectMessages from 'app/screens/more_dms';
import Notification from 'app/screens/notification';
import OptionsModal from 'app/screens/options_modal';
import Root from 'app/screens/root';
import SSO from 'app/screens/sso';
import Search from 'app/screens/search';
import SelectServer from 'app/screens/select_server';
import SelectTeam from 'app/screens/select_team';
import Settings from 'app/screens/settings';
import Thread from 'app/screens/thread';
import UserProfile from 'app/screens/user_profile';

import IntlWrapper from 'app/components/root';

function wrapWithContextProvider(Comp, excludeEvents = false) {
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
    Navigation.registerComponent('AccountSettings', () => wrapWithContextProvider(AccountSettings), store, Provider);
    Navigation.registerComponent('AccountNotifications', () => wrapWithContextProvider(AccountNotifications), store, Provider);
    Navigation.registerComponent('Channel', () => wrapWithContextProvider(Channel), store, Provider);
    Navigation.registerComponent('ChannelAddMembers', () => wrapWithContextProvider(ChannelAddMembers), store, Provider);
    Navigation.registerComponent('ChannelInfo', () => wrapWithContextProvider(ChannelInfo), store, Provider);
    Navigation.registerComponent('ChannelMembers', () => wrapWithContextProvider(ChannelMembers), store, Provider);
    Navigation.registerComponent('CreateChannel', () => wrapWithContextProvider(CreateChannel), store, Provider);
    Navigation.registerComponent('EditPost', () => wrapWithContextProvider(EditPost), store, Provider);
    Navigation.registerComponent('ImagePreview', () => wrapWithContextProvider(ImagePreview), store, Provider);
    Navigation.registerComponent('LoadTeam', () => wrapWithContextProvider(LoadTeam), store, Provider);
    Navigation.registerComponent('Login', () => wrapWithContextProvider(Login), store, Provider);
    Navigation.registerComponent('LoginOptions', () => wrapWithContextProvider(LoginOptions), store, Provider);
    Navigation.registerComponent('MFA', () => wrapWithContextProvider(Mfa), store, Provider);
    Navigation.registerComponent('MoreChannels', () => wrapWithContextProvider(MoreChannels), store, Provider);
    Navigation.registerComponent('MoreDirectMessages', () => wrapWithContextProvider(MoreDirectMessages), store, Provider);
    Navigation.registerComponent('OptionsModal', () => wrapWithContextProvider(OptionsModal), store, Provider);
    Navigation.registerComponent('Notification', () => wrapWithContextProvider(Notification, true), store, Provider);
    Navigation.registerComponent('Root', () => Root, store, Provider);
    Navigation.registerComponent('Search', () => wrapWithContextProvider(Search), store, Provider);
    Navigation.registerComponent('SelectServer', () => wrapWithContextProvider(SelectServer), store, Provider);
    Navigation.registerComponent('SelectTeam', () => wrapWithContextProvider(SelectTeam), store, Provider);
    Navigation.registerComponent('Settings', () => wrapWithContextProvider(Settings), store, Provider);
    Navigation.registerComponent('SSO', () => wrapWithContextProvider(SSO), store, Provider);
    Navigation.registerComponent('Thread', () => wrapWithContextProvider(Thread), store, Provider);
    Navigation.registerComponent('UserProfile', () => wrapWithContextProvider(UserProfile), store, Provider);
}
