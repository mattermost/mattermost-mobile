// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Channel from './channel';
import Login from './login/login_container.js';
import Root from './root/root_container.js';
import Search from './search/search_container.js';
import SelectServer from './select_server/select_server_container.js';
import SelectTeam from './select_team/select_team_container.js';

const scenes = {
    Root,
    SelectServer,
    Login,
    SelectTeam,
    ChannelView: Channel, // Special case the name for this one to avoid ambiguity
    Search
};

export function getComponentForScene(key) {
    return scenes[key];
}
