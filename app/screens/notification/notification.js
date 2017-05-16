// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import {changeOpacity} from 'app/utils/theme';

import icon from 'assets/images/icon.png';

export default class Notification extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            goToNotification: PropTypes.func.isRequired
        }).isRequired,
        notification: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    notificationTapped = () => {
        const {actions, navigator, notification, theme} = this.props;

        navigator.dismissInAppNotification();
        actions.goToNotification(notification);
        navigator.resetTo({
            screen: 'Channel',
            animated: false,
            navigatorStyle: {
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: theme.centerChannelBg
            }
        });
    };

    render() {
        return (
            <View style={style.container}>
                <TouchableOpacity
                    style={{flex: 1, flexDirection: 'row'}}
                    onPress={this.notificationTapped}
                >
                    <View>
                        <Image
                            source={icon}
                            style={style.icon}
                        />
                    </View>
                    <View style={{flex: 1, flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'flex-start', marginLeft: 10}} >
                        <Text
                            numberOfLines={2}
                            style={style.message}
                        >
                            {this.props.notification.message}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }
}

const style = StyleSheet.create({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity('#000', 0.9),
        flexDirection: 'row',
        justifyContent: 'flex-start',
        padding: 10,
        width: Dimensions.get('window').width,
        ...Platform.select({
            android: {
                height: 60
            },
            ios: {
                height: 80
            }
        })
    },
    icon: {
        borderRadius: 15,
        height: 30,
        width: 30
    },
    message: {
        color: 'white',
        fontSize: 13
    }
});
