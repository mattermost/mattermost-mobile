// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import connection from './connection';
import dimension from './dimension';
import isTablet from './is_tablet';
import orientation from './orientation';
import statusBarHeight from './status_bar';
import websocket from './websocket';

export default combineReducers({
    connection,
    dimension,
    isTablet,
    orientation,
    statusBarHeight,
    websocket,
});
