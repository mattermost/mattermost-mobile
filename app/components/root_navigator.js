// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import {Image, Navigator, StyleSheet, Text, TouchableOpacity} from 'react-native';
import SelectServerView from './select_server_view';

import menuImage from 'images/menu.png';

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flex: 1
    },

    button: {
        backgroundColor: 'white',
        padding: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#CDCDCD'
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '500'
    },
    navBar: {
        backgroundColor: 'white',
        flexDirection: 'row'
    },
    navBarText: {
        fontSize: 16,
        marginVertical: 10
    },
    navBarTitleText: {
        color: '#373E4D',
        fontWeight: '500',
        marginVertical: 9
    },
    navBarLeftButton: {
        paddingLeft: 10
    },
    navBarRightButton: {
        paddingRight: 10
    },
    navBarButtonText: {
        color: '#5890FF'
    },

    activityIndicator: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 8,
        flex: 1
    },

    menuImage: {
        height: 30,
        width: 30
    }
});

const NavigationBarRouteMapper = {
    LeftButton(route, navigator, index, navState) {
        if (index === 0) {
            return null;
        }

        const previousRoute = navState.routeStack[index - 1];

        if (previousRoute.signin) {
            return (
                <TouchableOpacity
                    onPress={() => navigator.pop()}
                    style={styles.navBarLeftButton}
                >
                    <Image
                        style={styles.menuImage}
                        source={menuImage}
                    />
                </TouchableOpacity>
            );
        }

        let title = null;
        if (previousRoute.root) {
            title = 'Server';
        } else if (previousRoute.channels) {
            title = 'Channels';
        }

        return (
            <TouchableOpacity
                onPress={() => navigator.pop()}
                style={styles.navBarLeftButton}
            >
                <Text style={[styles.navBarText, styles.navBarButtonText]}>
                    {'< ' + title}
                </Text>
            </TouchableOpacity>
        );
    },

    RightButton() {
        return null;
    },

    Title(route) {
        return (
            <Text style={[styles.navBarText, styles.navBarTitleText]}>
                {route.title}
            </Text>
        );
    }
};

export default class RootNavigator extends React.Component {
    renderScene = (route, navigator) => {
        if (route.root) {
            return (
                <SelectServerView
                    onProceed={() => {
                        navigator.push({signin: true});
                    }}
                />
            );
        } else if (route.signin) {
            // return (
            //     <LoginView
            //         onSignIn={() => {
            //             navigator.push({title: 'Team Selection', });
            //         }}
            //     />
            // );
        }

        return null;
    }

    render() {
        return (
            <Navigator
                style={styles.container}
                initialRouteStack={[{title: 'Mattermost Lite', root: true}]}
                renderScene={this.renderScene}
                navigationBar={
                    <Navigator.NavigationBar
                        routeMapper={NavigationBarRouteMapper}
                        style={styles.navBar}
                    />
                }
            />
        );
    }
}
