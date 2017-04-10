// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Image, Platform, StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import {makeStyleSheetFromTheme} from 'app/utils/theme';

import placeholder from 'assets/images/profile.jpg';

import Client from 'mattermost-redux/client';

const statusToIcon = {
    online: 'check',
    away: 'minus'
};

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2
});

export default class ProfilePicture extends React.PureComponent {
    static propTypes = {
        size: React.PropTypes.number,
        statusBorderWidth: React.PropTypes.number,
        statusSize: React.PropTypes.number,
        statusIconSize: React.PropTypes.number,
        user: React.PropTypes.object,
        status: React.PropTypes.string,
        theme: React.PropTypes.object.isRequired,
        actions: React.PropTypes.shape({
            getStatusForId: React.PropTypes.func.isRequired
        })
    };

    static defaultProps = {
        size: 128,
        statusBorderWidth: 2,
        statusSize: 14,
        statusIconSize: 8
    };

    componentDidMount() {
        if (!this.props.status && this.props.user) {
            this.props.actions.getStatusForId(this.props.user.id);
        }
    }

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
                    size={this.props.statusIconSize}
                />
            );
        } else {
            statusIcon = (
                <View
                    style={[style.offlineIcon, {
                        borderRadius: this.props.statusSize / 2,
                        height: this.props.statusSize - this.props.statusBorderWidth,
                        width: this.props.statusSize - this.props.statusBorderWidth,
                        borderWidth: Platform.select({
                            ios: this.props.statusBorderWidth,
                            android: this.props.statusBorderWidth / 2
                        })
                    }]}
                />
            );
        }

        return (
            <View style={{width: this.props.size + STATUS_BUFFER, height: this.props.size + STATUS_BUFFER}}>
                <Image
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={{uri: pictureUrl}}
                    defaultSource={placeholder}
                />
                {this.props.status &&
                    <View
                        style={[
                            style.statusWrapper,
                            {
                                width: this.props.statusSize,
                                height: this.props.statusSize,
                                borderWidth: this.props.statusBorderWidth,
                                borderRadius: this.props.statusSize / 2,
                                borderColor: this.props.theme.centerChannelBg
                            }
                        ]}
                    >
                        <View
                            style={[
                                style.statusContainer,
                                {
                                    width: this.props.statusSize - this.props.statusBorderWidth,
                                    height: this.props.statusSize - this.props.statusBorderWidth,
                                    borderRadius: (this.props.statusSize - this.props.statusBorderWidth) / 2,
                                    padding: this.props.statusBorderWidth
                                },
                                style[this.props.status
                            ]]}
                        >
                            {statusIcon}
                        </View>
                    </View>
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        statusWrapper: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center'
        },
        statusContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        },
        status: {
            color: theme.centerChannelBg
        },
        online: {
            backgroundColor: theme.onlineIndicator
        },
        away: {
            backgroundColor: theme.awayIndicator
        },
        offline: {
            backgroundColor: theme.centerChannelBg
        },
        offlineIcon: {
            borderColor: '#bababa'
        }
    });
});
