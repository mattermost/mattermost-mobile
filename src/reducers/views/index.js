// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import login from './login.js';
import selectServer from './select_server.js';
import device from '../device.js';
import logout from '../logout.js';

export default combineReducers({
    login,
    selectServer,

    device,
    logout
});
