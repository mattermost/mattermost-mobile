// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import Channel from './channel';
import ChannelDrawer from './channel_drawer';
import ChannelInfo from './channel_info';
import LoadTeam from './load_team';
import Login from './login/login_container.js';
import RightMenuDrawer from './right_menu_drawer';
import Root from './root/root_container.js';
import Search from './search/search_container.js';
import SelectServer from './select_server/select_server_container.js';
import SelectTeam from './select_team/select_team_container.js';

const scenes = {
    ChannelView: Channel, // Special case the name for this one to avoid ambiguity
    ChannelDrawer,
    ChannelInfo,
    LoadTeam,
    Login,
    RightMenuDrawer,
    Root,
    Search,
    SelectServer,
    SelectTeam
};

export function getComponentForScene(key) {
    return scenes[key];
}
