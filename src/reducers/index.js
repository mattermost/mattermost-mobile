// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channels from './channels';
import device from './device.js';
import general from './general.js';
import login from './login';
import teams from './teams';
import posts from './posts';

const entities = combineReducers({
    channels,
    general,
    teams,
    posts
});

const views = combineReducers({
    device,
    login
});

export default combineReducers({
    entities,
    views
});
