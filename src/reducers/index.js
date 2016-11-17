// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channel from './channel.js';
import device from './device.js';
import general from './general.js';
import login from './login';
import logout from './logout';
import teams from './teams';
import posts from './posts';

import SelectServer from './views/select_server.js';

const entities = combineReducers({
    channel,
    general,
    teams,
    posts
});

const views = combineReducers({
    device,
    login,
    logout,
    SelectServer
});

export default combineReducers({
    entities,
    views
});
