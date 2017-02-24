// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {
    AccountSettings,
    ChannelView,
    ChannelDrawer,
    ChannelInfo,
    ChannelMembers,
    ChannelAddMembers,
    LoadTeam,
    Login,
    Mfa,
    MoreChannels,
    MoreDirectMessages,
    OptionsModal,
    RightMenuDrawer,
    Root,
    Search,
    SelectServer,
    SelectTeam,
    Thread,
    UserProfile
} from 'app/scenes';

import keyMirror from 'service/utils/key_mirror';

export const RouteTransitions = keyMirror({
    Horizontal: null
});

export const Routes = {
    AccountSettings: {
        key: 'AccountSettings',
        transition: RouteTransitions.Horizontal,
        component: AccountSettings,
        navigationProps: {
            title: {id: 'user.settings.modal.title', defaultMessage: 'Account Settings'}
        }
    },
    ChannelInfo: {
        key: 'ChannelInfo',
        transition: RouteTransitions.Horizontal,
        component: ChannelInfo,
        navigationProps: {
            title: {id: 'mobile.routes.channelInfo', defaultMessage: 'Info'}
        }
    },
    ChannelDrawer: {
        key: 'ChannelDrawer',
        component: ChannelDrawer
    },
    ChannelMembers: {
        key: 'ChannelMembers',
        transition: RouteTransitions.Horizontal,
        component: ChannelMembers,
        navigationProps: {
            title: {id: 'channel_header.manageMembers', defaultMessage: 'Manage Members'}
        }
    },
    ChannelAddMembers: {
        key: 'ChannelAddMembers',
        transition: RouteTransitions.Horizontal,
        component: ChannelAddMembers,
        navigationProps: {
            title: {id: 'channel_header.addMembers', defaultMessage: 'Add Members'}
        }
    },
    ChannelView: {
        key: 'ChannelView',
        transition: RouteTransitions.Horizontal,
        component: ChannelView
    },
    LoadTeam: {
        key: 'LoadTeam',
        component: LoadTeam
    },
    Login: {
        key: 'Login',
        transition: RouteTransitions.Horizontal,
        component: Login,
        navigationProps: {
            title: {id: 'mobile.routes.login', defaultMessage: 'Login'}
        }
    },
    Mfa: {
        key: 'Mfa',
        transition: RouteTransitions.Horizontal,
        component: Mfa,
        navigationProps: {
            title: {id: 'mobile.routes.mfa', defaultMessage: 'Multi-factor Authentication'}
        }
    },
    MoreChannels: {
        key: 'MoreChannels',
        component: MoreChannels,
        navigationProps: {
            title: {id: 'more_channels.title', defaultMessage: 'More Channels'}
        }
    },
    MoreDirectMessages: {
        key: 'MoreDirectMessages',
        component: MoreDirectMessages,
        navigationProps: {
            title: {id: 'more_direct_channels.title', defaultMessage: 'Direct Messages'}
        }
    },
    OptionsModal: {
        key: 'OptionsModal',
        component: OptionsModal,
        navigationProps: {
            hideNavBar: true
        }
    },
    RightMenuDrawer: {
        key: 'RightMenuDrawer',
        component: RightMenuDrawer
    },
    Root: {
        key: 'Root',
        component: Root
    },
    Search: {
        key: 'Search',
        transition: RouteTransitions.Horizontal,
        component: Search
    },
    SelectServer: {
        key: 'SelectServer',
        component: SelectServer,
        navigationProps: {
            title: {id: 'mobile.routes.enterServerUrl', defaultMessage: 'Enter Server URL'}
        }
    },
    SelectTeam: {
        key: 'SelectTeam',
        component: SelectTeam,
        navigationProps: {
            title: {id: 'mobile.routes.selectTeam', defaultMessage: 'Select Team'}
        }
    },
    Thread: {
        key: 'Thread',
        transition: RouteTransitions.Horizontal,
        component: Thread
    },
    UserProfile: {
        key: 'UserProfile',
        transition: RouteTransitions.Horizontal,
        component: UserProfile,
        navigationProps: {
            title: {id: 'mobile.routes.user_profile', defaultMessage: 'Profile'}
        }
    }
};

export default Routes;
