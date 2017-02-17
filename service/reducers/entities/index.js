// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channels from './channels';
import general from './general';
import users from './users';
import teams from './teams';
import posts from './posts';
import files from './files';
import preferences from './preferences';

export default combineReducers({
    general,
    users,
    teams,
    channels,
    posts,
    files,
    preferences
});
