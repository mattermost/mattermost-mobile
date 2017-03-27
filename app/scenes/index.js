// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import About from './about';
import AccountNotifications from './account_notifications';
import AccountSettings from './account_settings';
import Channel from './channel';
import ChannelDrawer from './channel_drawer';
import ChannelInfo from './channel_info';
import ChannelMembers from './channel_members';
import ChannelAddMembers from './channel_add_members';
import CreateChannel from './create_channel';
import EditPost from './edit_post';
import ImagePreview from './image_preview';
import LoadTeam from './load_team';
import Login from './login/login_container.js';
import LoginOptions from './login_options';
import Mfa from './mfa';
import MoreChannels from './more_channels';
import MoreDirectMessages from './more_dms';
import OptionsModal from './options_modal';
import Settings from './settings';
import Root from './root/root_container.js';
import Search from './search/search_container.js';
import SelectServer from './select_server/select_server_container.js';
import SelectTeam from './select_team/select_team_container.js';
import Thread from './thread';
import UserProfile from './user_profile';
import Saml from './saml';

module.exports = {
    About,
    AccountNotifications,
    AccountSettings,
    ChannelView: Channel, // Special case the name for this one to avoid ambiguity
    ChannelDrawer,
    ChannelInfo,
    ChannelMembers,
    ChannelAddMembers,
    CreateChannel,
    EditPost,
    ImagePreview,
    LoadTeam,
    Login,
    LoginOptions,
    Mfa,
    MoreChannels,
    MoreDirectMessages,
    OptionsModal,
    Settings,
    Root,
    Search,
    SelectServer,
    SelectTeam,
    Thread,
    UserProfile,
    Saml
};
