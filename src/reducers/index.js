// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import entities from './entities';
import requests from './requests';
import views from './views';

export default combineReducers({
    entities,
    requests,
    views
});
