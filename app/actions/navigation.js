// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Navigation} from 'react-native-navigation';

import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

export function resetToChannel() {
    return (dispatch, getState) => {
        const theme = getTheme(getState());

        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            name: 'Channel',
                            options: {
                                layout: {
                                    backgroundColor: theme.centerChannelBg,
                                },
                            },
                        },
                    }],
                    options: {
                        statusBar: {
                            visible: true,
                        },
                        topBar: {
                            visible: false,
                        },
                    },
                },
            },
        });
    };
}

export function resetToSelectServer(allowOtherServers) {
    return () => {
        Navigation.setRoot({
            root: {
                stack: {
                    children: [{
                        component: {
                            name: 'SelectServer',
                            passProps: {
                                allowOtherServers,
                            },
                        },
                    }],
                    options: {
                        layout: {
                            backgroundColor: 'transparent',
                        },
                        statusBar: {
                            visible: true,
                        },
                        topBar: {
                            visible: false,
                        },
                    },
                },
            },
        });
    };
}
