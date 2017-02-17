// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channels from './channels';
import files from './files';
import general from './general';
import posts from './posts';
import teams from './teams';
import users from './users';
import preferences from './preferences';

export default combineReducers({
    channels,
    files,
    general,
    posts,
    teams,
    users,
    preferences
});
