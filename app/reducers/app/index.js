// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {combineReducers} from 'redux';

import build from './build';
import version from './version';

export default combineReducers({
    build,
    version,
});
