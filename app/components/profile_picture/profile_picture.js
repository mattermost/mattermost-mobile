// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, Platform, View} from 'react-native';

import {General} from 'mattermost-redux/constants';

import {AwayIcon, DndIcon, OfflineIcon, OnlineIcon} from 'app/components/status_icons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import placeholder from 'assets/images/profile.jpg';

import {Client4} from 'mattermost-redux/client';

const statusToIcon = {
    away: AwayIcon,
    dnd: DndIcon,
    offline: OfflineIcon,
    online: OnlineIcon
};

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2
});

export default class ProfilePicture extends PureComponent {
    static propTypes = {
        size: PropTypes.number,
        statusBorderWidth: PropTypes.number,
        statusSize: PropTypes.number,
        user: PropTypes.object,
        status: PropTypes.string,
        edit: PropTypes.bool,
        imageUri: PropTypes.string,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getStatusForId: PropTypes.func.isRequired
        })
    };

    static defaultProps = {
        size: 128,
        statusBorderWidth: 2,
        statusSize: 14,
        edit: false
    };

    componentDidMount() {
        if (!this.props.status && this.props.user) {
            this.props.actions.getStatusForId(this.props.user.id);
        }
    }

    render() {
        const {theme, edit, imageUri} = this.props;
        const style = getStyleSheet(theme);

        let pictureUrl;
        if (this.props.user) {
            pictureUrl = Client4.getProfilePictureUrl(this.props.user.id, this.props.user.last_picture_update);
        }

        if (edit && imageUri) {
            pictureUrl = imageUri;
        }

        let Icon;
        let iconColor;
        if (this.props.status && statusToIcon[this.props.status]) {
            Icon = statusToIcon[this.props.status];

            switch (this.props.status) {
            case General.AWAY:
                iconColor = theme.awayIndicator;
                break;
            case General.DND:
                iconColor = theme.dndIndicator;
                break;
            case General.ONLINE:
                iconColor = theme.onlineIndicator;
                break;
            default:
                iconColor = theme.centerChannelColor;
                break;
            }
        } else {
            Icon = statusToIcon.offline;
            iconColor = theme.centerChannelColor;
        }

        let iconContainer;
        let icon = (
            <Icon
                height={this.props.statusSize}
                width={this.props.statusSize}
                color={iconColor}
            />
        );

        if (edit) {
            Icon = FontAwesomeIcon;
            iconColor = changeOpacity(theme.centerChannelColor, 0.6);
            icon = (
                <Icon
                    name='camera'
                    size={this.props.statusSize / 1.7}
                    color={iconColor}
                />
            );

            iconContainer = (
                <View
                    style={[
                        style.iconWrapper,
                        {
                            borderRadius: this.props.statusSize / 2,
                            width: this.props.statusSize,
                            height: this.props.statusSize,
                            backgroundColor: 'white'
                        }]}
                >
                    {icon}
                </View>
            );
        } else if (this.props.status && !edit) {
            iconContainer = (
                <View style={[style.iconWrapper, {borderRadius: this.props.statusSize / 2}]}>
                    {icon}
                </View>
            );
        }

        return (
            <View style={{width: this.props.size + STATUS_BUFFER, height: this.props.size + STATUS_BUFFER}}>
                <Image
                    key={pictureUrl}
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={{uri: pictureUrl}}
                    defaultSource={placeholder}
                />
                {iconContainer}
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        iconWrapper: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg
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
        dnd: {
            backgroundColor: 'red'
        },
        offline: {
            backgroundColor: theme.centerChannelBg
        },
        offlineIcon: {
            borderColor: '#bababa'
        }
    };
});
