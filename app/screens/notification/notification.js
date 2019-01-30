// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    Image,
    InteractionManager,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import ProfilePicture from 'app/components/profile_picture';
import {changeOpacity} from 'app/utils/theme';

import {isDirectChannel} from 'mattermost-redux/utils/channel_utils';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {displayUsername} from 'mattermost-redux/utils/user_utils';

import logo from 'assets/images/icon.png';
import webhookIcon from 'assets/images/icons/webhook.jpg';

const IMAGE_SIZE = 33;

export default class Notification extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            loadFromPushNotification: PropTypes.func.isRequired,
        }).isRequired,
        channel: PropTypes.object,
        config: PropTypes.object,
        deviceWidth: PropTypes.number.isRequired,
        notification: PropTypes.object.isRequired,
        teammateNameDisplay: PropTypes.string,
        navigator: PropTypes.object,
        theme: PropTypes.object.isRequired,
        user: PropTypes.object,
    };

    notificationTapped = () => {
        const {actions, navigator, notification} = this.props;

        EventEmitter.emit('close_channel_drawer');
        InteractionManager.runAfterInteractions(() => {
            navigator.dismissInAppNotification();
            if (!notification.localNotification) {
                actions.loadFromPushNotification(notification);

                if (Platform.OS === 'android') {
                    navigator.dismissModal({animation: 'none'});
                }

                navigator.popToRoot({
                    animated: false,
                });
            }
        });
    };

    getNotificationIcon = () => {
        const {config, notification, user} = this.props;
        const {data} = notification;

        let icon = (
            <Image
                source={logo}
                style={style.icon}
            />
        );

        if (data.from_webhook && config.EnablePostIconOverride === 'true' && data.use_user_icon !== 'true') {
            const wsIcon = data.override_icon_url ? {uri: data.override_icon_url} : webhookIcon;
            icon = (
                <Image
                    source={wsIcon}
                    style={style.icon}
                />
            );
        } else if (user) {
            icon = (
                <ProfilePicture
                    userId={user.id}
                    size={IMAGE_SIZE}
                />
            );
        }

        return icon;
    };

    getNotificationTitle = (notification) => {
        const {channel} = this.props;
        const {message, data} = notification;

        if (data.version === 'v2') {
            if (data.channel_name) {
                return (
                    <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={style.title}
                    >
                        {data.channel_name}
                    </Text>
                );
            }

            return null;
        }

        const msg = message.split(':');
        const titleText = msg.shift();

        let title = (
            <Text
                numberOfLines={1}
                ellipsizeMode='tail'
                style={style.title}
            >
                {titleText}
            </Text>
        );

        const userName = this.getNotificationUserName();
        if (userName && channel) {
            let channelName;
            let inText;
            if (!isDirectChannel(channel)) {
                inText = (
                    <FormattedText
                        id='mobile.notification.in'
                        defaultMessage=' in '
                        style={style.message}
                    />
                );

                channelName = (
                    <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={[style.title, style.channelName]}
                    >
                        {channel.display_name}
                    </Text>
                );
            }

            title = (
                <View style={{flex: 1, flexDirection: 'row'}}>
                    {userName}
                    {inText}
                    {channelName}
                </View>
            );
        }

        return title;
    };

    getNotificationUserName = () => {
        const {config, notification, teammateNameDisplay, user} = this.props;
        const {data} = notification;

        let userName;
        if (data.override_username && config.EnablePostUsernameOverride === 'true') {
            userName = (
                <Text style={style.title}>
                    {data.override_username}
                </Text>
            );
        } else if (user) {
            userName = (
                <Text style={style.title}>
                    {displayUsername(user, teammateNameDisplay)}
                </Text>
            );
        }

        return userName;
    };

    render() {
        const {deviceWidth, notification} = this.props;
        const {data, message} = notification;

        if (message) {
            let messageText;
            if (data.version !== 'v2') {
                const msg = message.split(':');
                messageText = msg.join('').trim();
            } else if (Platform.OS === 'ios') {
                messageText = message.body || message;
            } else {
                messageText = message;
            }

            const title = this.getNotificationTitle(notification);
            const icon = this.getNotificationIcon();

            return (
                <View style={[style.container, {width: deviceWidth}]}>
                    <TouchableOpacity
                        style={{flex: 1, flexDirection: 'row'}}
                        onPress={this.notificationTapped}
                    >
                        <View style={style.iconContainer}>
                            {icon}
                        </View>
                        <View style={style.textContainer}>
                            {title}
                            <View style={{flex: 1}}>
                                <Text
                                    numberOfLines={1}
                                    ellipsizeMode='tail'
                                    style={style.message}
                                >
                                    {messageText}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            );
        }

        return null;
    }
}

const style = StyleSheet.create({
    container: {
        alignItems: 'flex-start',
        backgroundColor: changeOpacity('#000', 0.9),
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 10,
        ...Platform.select({
            android: {
                height: 68,
            },
            ios: {
                height: 88,
            },
        }),
    },
    iconContainer: {
        ...Platform.select({
            android: {
                paddingTop: 17,
            },
            ios: {
                paddingTop: 37,
            },
        }),
    },
    icon: {
        borderRadius: (IMAGE_SIZE / 2),
        height: IMAGE_SIZE,
        width: IMAGE_SIZE,
    },
    textContainer: {
        flex: 1,
        flexDirection: 'column',
        alignSelf: 'stretch',
        alignItems: 'flex-start',
        marginLeft: 10,
        ...Platform.select({
            android: {
                marginTop: 17,
                height: 50,
            },
            ios: {
                paddingTop: 37,
            },
        }),
    },
    title: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    channelName: {
        alignSelf: 'stretch',
        alignItems: 'flex-start',
        flex: 1,
    },
    message: {
        color: '#FFFFFF',
        fontSize: 14,
    },
});
