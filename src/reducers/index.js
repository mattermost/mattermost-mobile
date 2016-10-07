// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';
import device from './device.js';
import general from './general.js';

const entities = combineReducers({
    general
});

const views = combineReducers({
    device
});

export default combineReducers({
    entities,
    views
});