// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channel from './channels';
import device from './device.js';
import general from './general.js';
import login from './login';
import logout from './logout';
import post from './posts';
import team from './teams';

const entities = combineReducers({
    channel,
    general,
    team,
    post
});

const views = combineReducers({
    device,
    login,
    logout
});

export default combineReducers({
    entities,
    views
});
