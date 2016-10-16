// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channels from './channels';
import device from './device.js';
import general from './general.js';
import teams from './teams';

const entities = combineReducers({
    channels,
    general,
    teams
});

const views = combineReducers({
    device
});

export default combineReducers({
    entities,
    views
});
