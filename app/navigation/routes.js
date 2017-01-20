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
    Root: {
        key: 'Root'
    },
    SelectServer: {
        key: 'SelectServer',
        title: {id: 'mobile.routes.enterServerUrl', defaultMessage: 'Enter Server URL'}
    },
    Login: {
        key: 'Login',
        title: {id: 'mobile.routes.login', defaultMessage: 'Login'},
        transition: RouteTransitions.Horizontal
    },
    SelectTeam: {
        key: 'SelectTeam',
        title: {id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'},
        transition: RouteTransitions.Horizontal
    },
    ChannelView: {
        key: 'ChannelView'
    },
    Search: {
        key: 'Search',
        transition: 'horizontal'
    },
    ChannelInfo: {
        key: 'ChannelInfo',
        title: {id: 'mobile.routes.channelInfo', defaultMessage: 'Info'}
    },
    ChannelDrawer: {
        key: 'ChannelDrawer',
        type: RouteTypes.LeftDrawer
    }
};

export default Routes;
