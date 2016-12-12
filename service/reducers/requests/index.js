// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import general from './general';
import channels from './channels';
import users from './users';
import teams from './teams';
import preferences from './preferences';

export default combineReducers({
    general,
    channels,
    users,
    teams,
    preferences
});
