// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import connection from './connection';
import dimension from './dimension';
import statusBarHeight from './status_bar';

export default combineReducers({
    connection,
    dimension,
    statusBarHeight
});
