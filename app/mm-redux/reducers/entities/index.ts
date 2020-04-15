// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import channels from './channels';
import general from './general';
import users from './users';
import teams from './teams';
import posts from './posts';
import files from './files';
import preferences from './preferences';
import typing from './typing';
import integrations from './integrations';
import emojis from './emojis';
import gifs from './gifs';
import jobs from './jobs';
import search from './search';
import roles from './roles';
import schemes from './schemes';
import groups from './groups';
import bots from './bots';
import channelCategories from './channel_categories';

export default combineReducers({
    general,
    users,
    teams,
    channels,
    posts,
    files,
    preferences,
    typing,
    integrations,
    emojis,
    gifs,
    jobs,
    search,
    roles,
    schemes,
    groups,
    bots,
    channelCategories,
});
