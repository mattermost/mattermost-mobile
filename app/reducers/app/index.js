// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import build from './build';
import version from './version';
import previousVersion from './previousVersion';
import plugins from './plugins';

export default combineReducers({
    build,
    version,
    previousVersion,
    plugins,
});
