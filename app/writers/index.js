// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineWriters} from 'realm-react-redux';

import general from './general';
import role from './role';
import user from './user';

export default combineWriters([
    general,
    role,
    user,
]);
