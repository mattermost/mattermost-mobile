// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import placeholder from 'assets/images/profile.jpg';

import Client from 'service/client';

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        container: {
            alignItems: 'flex-end',
            justifyContent: 'flex-end'
        },
        statusContainer: {
            width: 14,
            height: 14,
            position: 'absolute',
            bottom: 0,
            right: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: theme.centerChannelBg
        },
        status: {
            backgroundColor: 'transparent',
            color: theme.centerChannelBg
        },
        online: {
            backgroundColor: theme.onlineIndicator
        },
        away: {
            backgroundColor: theme.awayIndicator
        },
        offline: {
            backgroundColor: theme.centerChannelBg,
            borderColor: '#bababa'
        }
    });
});

const statusToIcon = {
    online: 'check',
    away: 'minus'
};

export default class ProfilePicture extends React.PureComponent {
    static propTypes = {
        size: React.PropTypes.number,
        user: React.PropTypes.object,
        status: React.PropTypes.string,
        theme: React.PropTypes.object.isRequired
    };

    static defaultProps = {
        size: 128
    };

    render() {
        const style = getStyleSheet(this.props.theme);

        let pictureUrl;
        if (this.props.user) {
            pictureUrl = Client.getProfilePictureUrl(this.props.user.id, this.props.user.last_picture_update);
        }

        let statusIcon;
        if (this.props.status && statusToIcon[this.props.status]) {
            statusIcon = (
                <Icon
                    style={style.status}
                    name={statusToIcon[this.props.status]}
                    size={8}
                />
            );
        }

        return (
            <View style={{width: this.props.size, height: this.props.size}}>
                <Image
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={{uri: pictureUrl}}
                    defaultSource={placeholder}
                />
                <View style={[style.statusContainer, style[this.props.status]]}>
                    {statusIcon}
                </View>
            </View>
        );
    }
}
