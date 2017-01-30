// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

export const RouteTransitions = keyMirror({
    Horizontal: null
});

export const Routes = {
    ChannelInfo: {
        key: 'ChannelInfo',
        title: {id: 'mobile.routes.channelInfo', defaultMessage: 'Info'},
        transition: RouteTransitions.Horizontal
    },
    ChannelDrawer: {
        key: 'ChannelDrawer'
    },
    ChannelMembers: {
        key: 'ChannelMembers',
        title: {id: 'channel_header.manageMembers', defaultMessage: 'Manage Members'},
        transition: RouteTransitions.Horizontal
    },
    ChannelView: {
        key: 'ChannelView',
        transition: RouteTransitions.Horizontal
    },
    LoadTeam: {
        key: 'LoadTeam'
    },
    Login: {
        key: 'Login',
        title: {id: 'mobile.routes.login', defaultMessage: 'Login'},
        transition: RouteTransitions.Horizontal
    },
    Mfa: {
        key: 'Mfa',
        title: {id: 'mobile.routes.mfa', defaultMessage: 'Multi-factor Authentication'},
        transition: RouteTransitions.Horizontal
    },
    RightMenuDrawer: {
        key: 'RightMenuDrawer'
    },
    Root: {
        key: 'Root'
    },
    Search: {
        key: 'Search',
        transition: RouteTransitions.Horizontal
    },
    SelectServer: {
        key: 'SelectServer',
        title: {id: 'mobile.routes.enterServerUrl', defaultMessage: 'Enter Server URL'}
    },
    SelectTeam: {
        key: 'SelectTeam',
        title: {id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'},
        transition: RouteTransitions.Horizontal
    }
};

export default Routes;
