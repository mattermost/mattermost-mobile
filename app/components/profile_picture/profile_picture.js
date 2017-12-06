// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, Platform, View} from 'react-native';

import UserStatus from 'app/components/user_status';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import placeholder from 'assets/images/profile.jpg';

import {Client4} from 'mattermost-redux/client';

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
        showStatus: PropTypes.bool,
        status: PropTypes.string,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            getStatusForId: PropTypes.func.isRequired
        })
    };

    static defaultProps = {
        showStatus: true,
        size: 128,
        statusBorderWidth: 2,
        statusSize: 14
    };

    componentDidMount() {
        if (!this.props.status && this.props.user) {
            this.props.actions.getStatusForId(this.props.user.id);
        }
    }

    render() {
        const {theme} = this.props;
        const style = getStyleSheet(theme);

        let pictureUrl;
        if (this.props.user) {
            pictureUrl = Client4.getProfilePictureUrl(this.props.user.id, this.props.user.last_picture_update);
        }

        const statusIcon = (
            <UserStatus
                size={this.props.statusSize}
                status={this.props.status}
            />
        );

        return (
            <View style={{width: this.props.size + STATUS_BUFFER, height: this.props.size + STATUS_BUFFER}}>
                <Image
                    key={pictureUrl}
                    style={{width: this.props.size, height: this.props.size, borderRadius: this.props.size / 2}}
                    source={{uri: pictureUrl}}
                    defaultSource={placeholder}
                />
                {this.props.showStatus &&
                    <View style={[style.statusWrapper, {borderRadius: this.props.statusSize / 2}]}>
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
            backgroundColor: theme.centerChannelBg
        },
        status: {
            color: theme.centerChannelBg
        }
    };
});
