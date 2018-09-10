// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers} from 'redux';

import announcement from './announcement';
import channel from './channel';
import clientUpgrade from './client_upgrade';
import extension from './extension';
import i18n from './i18n';
import login from './login';
import recentEmojis from './recent_emojis';
import root from './root';
import search from './search';
import selectServer from './select_server';
import team from './team';
import thread from './thread';
import user from './user';
import emoji from './emoji';
import post from './post';

export default combineReducers({
    announcement,
    channel,
    clientUpgrade,
    extension,
    i18n,
    login,
    recentEmojis,
    root,
    search,
    selectServer,
    team,
    thread,
    user,
    emoji,
    post,
});
