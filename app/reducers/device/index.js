// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import colorScheme from './color_scheme';
import connection from './connection';
import dimension from './dimension';
import isTablet from './is_tablet';
import orientation from './orientation';
import statusBarHeight from './status_bar';

export default combineReducers({
    colorScheme,
    connection,
    dimension,
    isTablet,
    orientation,
    statusBarHeight,
});
