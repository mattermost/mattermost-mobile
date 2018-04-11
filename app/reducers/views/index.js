// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

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
import emoji from './emoji';

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
    emoji,
});
