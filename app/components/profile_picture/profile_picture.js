// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, Platform, View} from 'react-native';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {Client4} from 'mattermost-redux/client';

import UserStatus from 'app/components/user_status';
import ImageCacheManager from 'app/utils/image_cache_manager';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import placeholder from 'assets/images/profile.jpg';

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

export default class ProfilePicture extends PureComponent {
    static propTypes = {
        size: PropTypes.number,
        statusBorderWidth: PropTypes.number,
        statusSize: PropTypes.number,
        user: PropTypes.object,
        showStatus: PropTypes.bool,
        status: PropTypes.string,
        edit: PropTypes.bool,
        imageUri: PropTypes.string,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getStatusForId: PropTypes.func.isRequired,
        }),
    };

    static defaultProps = {
        showStatus: true,
        size: 128,
        statusBorderWidth: 2,
        statusSize: 14,
        edit: false,
    };

    state = {
        pictureUrl: null,
    };

    componentWillMount() {
        const {edit, imageUri, user} = this.props;

        if (edit && imageUri) {
            this.setImageURL(imageUri);
        } else if (user) {
            ImageCacheManager.cache('', Client4.getProfilePictureUrl(user.id, user.last_picture_update), this.setImageURL);
        }
    }

    componentDidMount() {
        if (!this.props.status && this.props.user) {
            this.props.actions.getStatusForId(this.props.user.id);
        }
    }

    componentWillUpdate(nextProps) {
        if (Boolean(nextProps.user) !== Boolean(this.props.user) || nextProps.user.id !== this.props.user.id) {
            this.setState({pictureUrl: null});

            const nextUser = nextProps.user;

            if (nextUser) {
                ImageCacheManager.cache('', Client4.getProfilePictureUrl(nextUser.id, nextUser.last_picture_update), this.setImageURL);
            }
        }
    }

    setImageURL = (pictureUrl) => {
        this.setState({pictureUrl});
    };

    render() {
        const {edit, showStatus, theme} = this.props;
        const {pictureUrl} = this.state;
        const style = getStyleSheet(theme);

        let statusIcon;
        let statusStyle;
        if (edit) {
            const iconColor = changeOpacity(theme.centerChannelColor, 0.6);
            statusStyle = {
                width: this.props.statusSize,
                height: this.props.statusSize,
                backgroundColor: 'white',
            };
            statusIcon = (
                <FontAwesomeIcon
                    name='camera'
                    size={this.props.statusSize / 1.7}
                    color={iconColor}
                />
            );
        } else if (this.props.status && !edit) {
            statusIcon = (
                <UserStatus
                    size={this.props.statusSize}
                    status={this.props.status}
                />
            );
        }

        let source = null;
        if (pictureUrl) {
            let prefix = '';
            if (Platform.OS === 'android') {
                prefix = 'file://';
            }

            source = {
                uri: `${prefix}${pictureUrl}`,
            };
        }

        return (
            <View style={{width: this.props.size + STATUS_BUFFER, height: this.props.size + STATUS_BUFFER}}>
                <Image
                    key={pictureUrl}
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={source}
                    defaultSource={placeholder}
                />
                {(showStatus || edit) &&
                    <View style={[style.statusWrapper, statusStyle, {borderRadius: this.props.statusSize / 2}]}>
                        {statusIcon}
                    </View>
                }
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        statusWrapper: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg,
        },
        status: {
            color: theme.centerChannelBg,
        },
    };
});
