// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Platform, View} from 'react-native';
import FastImage from 'react-native-fast-image';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome';

import {Client4} from '@mm-redux/client';

import UserStatus from 'app/components/user_status';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import placeholder from 'assets/images/profile.jpg';

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

export default class ProfilePicture extends PureComponent {
    static propTypes = {
        isCurrentUser: PropTypes.bool.isRequired,
        size: PropTypes.number,
        statusSize: PropTypes.number,
        user: PropTypes.object,
        showStatus: PropTypes.bool,
        status: PropTypes.string,
        edit: PropTypes.bool,
        imageUri: PropTypes.string,
        profileImageUri: PropTypes.string,
        profileImageRemove: PropTypes.bool,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getStatusForId: PropTypes.func.isRequired,
            setProfileImageUri: PropTypes.func.isRequired,
        }),
    };

    static defaultProps = {
        showStatus: true,
        size: 128,
        statusSize: 14,
        edit: false,
    };

    state = {
        pictureUrl: null,
    };

    componentDidMount() {
        const {actions, edit, imageUri, profileImageUri, user, status} = this.props;
        this.mounted = true;

        if (!status && user) {
            actions.getStatusForId(user.id);
        }

        if (profileImageUri) {
            this.setImageURL(profileImageUri);
        } else if (edit && imageUri) {
            this.setImageURL(imageUri);
        } else if (user) {
            const uri = Client4.getProfilePictureUrl(user.id, user.last_picture_update);
            FastImage.preload([{uri, headers: Client4.getOptions({}).headers}]);

            this.setImageURL(uri);
            this.clearProfileImageUri();
        }
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    setImageURL = (pictureUrl) => {
        if (this.mounted) {
            this.setState({pictureUrl});
        }
    };

    clearProfileImageUri = () => {
        if (this.props.isCurrentUser && this.props.profileImageUri !== '') {
            this.props.actions.setProfileImageUri('');
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.profileImageRemove !== prevProps.profileImageRemove) {
            this.setImageURL(null);
        } else if (this.mounted) {
            if (this.props.edit && this.props.imageUri && this.props.imageUri !== prevProps.imageUri) {
                this.setImageURL(this.props.imageUri);
                return;
            }

            if (this.props.profileImageUri !== '' && this.props.profileImageUri !== prevProps.profileImageUri) {
                this.setImageURL(this.props.profileImageUri);
            }

            const url = prevProps.user ? Client4.getProfilePictureUrl(prevProps.user.id, prevProps.user.last_picture_update) : null;
            const nextUrl = this.props.user ? Client4.getProfilePictureUrl(this.props.user.id, this.props.user.last_picture_update) : null;

            if (nextUrl && url !== nextUrl) {
                // empty function is so that promise unhandled is not triggered in dev mode
                FastImage.preload([{uri: nextUrl, headers: Client4.getOptions({}).headers}]);
                this.setImageURL(nextUrl);
                this.clearProfileImageUri();
            }
        }
    }

    render() {
        const {edit, showStatus, theme, user} = this.props;
        const {pictureUrl} = this.state;
        const style = getStyleSheet(theme);

        let statusIcon;
        let statusStyle;
        if (edit) {
            const iconColor = changeOpacity(theme.centerChannelColor, 0.6);
            statusStyle = {
                width: this.props.statusSize,
                height: this.props.statusSize,
                backgroundColor: theme.centerChannelBg,
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
        let image;
        if (pictureUrl) {
            let prefix = '';
            if (Platform.OS === 'android' && !pictureUrl.startsWith('content://') &&
                !pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://')) {
                prefix = 'file://';
            }

            source = {
                uri: `${prefix}${pictureUrl}`,
            };

            image = (
                <FastImage
                    key={pictureUrl}
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={source}
                />
            );
        } else {
            image = (
                <FastImage
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={placeholder}
                />
            );
        }

        return (
            <View style={{width: this.props.size + STATUS_BUFFER, height: this.props.size + STATUS_BUFFER}}>
                {image}
                {(showStatus || edit) && (user && !user.is_bot) &&
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
