// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Constants from './constants';
import ChannelTypes from './channels';
import ErrorTypes from './errors';
import GeneralTypes from './general';
import UsersTypes from './users';
import TeamsTypes from './teams';
import PostsTypes from './posts';
import FilesTypes from './files';
import PreferencesTypes from './preferences';
import RequestStatus from './request_status';
import WebsocketEvents from './websocket';

const Preferences = {
    CATEGORY_DIRECT_CHANNEL_SHOW: 'direct_channel_show',
    CATEGORY_NOTIFICATIONS: 'notifications',
    CATEGORY_THEME: 'theme',
    EMAIL_INTERVAL: 'email_interval',
    INTERVAL_FIFTEEN_MINUTES: 15 * 60,
    INTERVAL_HOUR: 60 * 60,
    INTERVAL_IMMEDIATE: 30 // "immediate" is a 30 second interval
};

export {
    Constants,
    ErrorTypes,
    GeneralTypes,
    UsersTypes,
    TeamsTypes,
    ChannelTypes,
    PostsTypes,
    FilesTypes,
    PreferencesTypes,
    Preferences,
    RequestStatus,
    WebsocketEvents
};
