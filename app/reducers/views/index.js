// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import channel from './channel';
import drawer from './drawer';
import i18n from './i18n';
import login from './login';
import selectServer from './select_server';

export default combineReducers({
    channel,
    drawer,
    i18n,
    login,
    selectServer
});
