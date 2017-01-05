// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Constants from './constants';
import ChannelTypes from './channels';
import GeneralTypes from './general';
import UsersTypes from './users';
import TeamsTypes from './teams';
import PostsTypes from './posts';
import PreferencesTypes from './preferences';
import RequestStatus from './request_status';
import WebsocketEvents from './websocket';

const Preferences = {
    CATEGORY_DIRECT_CHANNEL_SHOW: 'direct_channel_show',
    CATEGORY_THEME: 'theme'
};

export {
    Constants,
    GeneralTypes,
    UsersTypes,
    TeamsTypes,
    ChannelTypes,
    PostsTypes,
    PreferencesTypes,
    Preferences,
    RequestStatus,
    WebsocketEvents
};
