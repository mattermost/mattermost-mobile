// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import login from './login';
import selectServer from './select_server';
import device from './device';
import i18n from './i18n';

export default combineReducers({
    device,
    i18n,
    login,
    selectServer
});
