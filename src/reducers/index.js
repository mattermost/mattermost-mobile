// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channel from './channel.js';
import general from './general.js';
import teams from './teams.js';
import posts from './posts.js';

import views from './views/index.js';

const entities = combineReducers({
    channel,
    general,
    teams,
    posts
});

export default combineReducers({
    entities,
    views
});
