// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import keyMirror from 'service/utils/key_mirror';

export const RouteTransitions = keyMirror({
    Horizontal: null
});

export const RouteTypes = keyMirror({
    LeftDrawer: null,
    RightDrawer: null
});

export const Routes = {
    ChannelInfo: {
        key: 'ChannelInfo',
        title: {id: 'mobile.routes.channelInfo', defaultMessage: 'Info'}
    },
    ChannelDrawer: {
        key: 'ChannelDrawer',
        type: RouteTypes.LeftDrawer
    },
    ChannelView: {
        key: 'ChannelView'
    },
    Login: {
        key: 'Login',
        title: {id: 'mobile.routes.login', defaultMessage: 'Login'},
        transition: RouteTransitions.Horizontal
    },
    RightSideMenu: {
        key: 'RightSideMenu',
        type: RouteTypes.RightDrawer
    },
    Root: {
        key: 'Root'
    },
    Search: {
        key: 'Search',
        transition: 'horizontal'
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
