// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import entities from './entities';
import requests from './requests';
import views from './views';
import navigation from './navigation';

export default combineReducers({
    entities,
    requests,
    views,
    navigation
});
