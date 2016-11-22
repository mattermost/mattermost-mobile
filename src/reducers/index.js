// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channel from './channel.js';
import device from './device.js';
import general from './general.js';
import login from './login.js';
import logout from './logout.js';
import teams from './teams.js';
import posts from './posts.js';

import SelectServer from './views/select_server.js';
import Login from './views/login.js';

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
    SelectServer,
    Login
});

export default combineReducers({
    entities,
    views
});
