// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channel from 'reducers/channel';
import device from 'reducers/device';
import general from 'reducers/general';
import login from 'reducers/login';
import logout from 'reducers/logout';
import post from 'reducers/post';
import team from 'reducers/team';

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
