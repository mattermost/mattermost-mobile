// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Image, TouchableOpacity, View} from 'react-native';

import AppIcon from 'app/components/app_icon';
import ProfilePicture from 'app/components/profile_picture';
import {emptyFunction} from 'app/utils/general';
import webhookIcon from 'assets/images/icons/webhook.jpg';
import {ViewTypes} from 'app/constants';

export default class PostProfilePicture extends PureComponent {
    static propTypes = {
        enablePostIconOverride: PropTypes.bool,
        fromWebHook: PropTypes.bool,
        isSystemMessage: PropTypes.bool,
        overrideIconUrl: PropTypes.string,
        onViewUserProfile: PropTypes.func,
        theme: PropTypes.object,
        userId: PropTypes.string,
    };

    static defaultProps = {
        onViewUserProfile: emptyFunction,
    };

    render() {
        const {
            enablePostIconOverride,
            fromWebHook,
            isSystemMessage,
            onViewUserProfile,
            overrideIconUrl,
            theme,
            userId,
        } = this.props;

        if (isSystemMessage) {
            return (
                <View>
                    <AppIcon
                        color={theme.centerChannelColor}
                        height={ViewTypes.PROFILE_PICTURE_SIZE}
                        width={ViewTypes.PROFILE_PICTURE_SIZE}
                    />
                </View>
            );
        }

        if (fromWebHook && enablePostIconOverride) {
            const icon = overrideIconUrl ? {uri: overrideIconUrl} : webhookIcon;

            return (
                <View>
                    <Image
                        source={icon}
                        style={{
                            height: ViewTypes.PROFILE_PICTURE_SIZE,
                            width: ViewTypes.PROFILE_PICTURE_SIZE,
                            borderRadius: ViewTypes.PROFILE_PICTURE_SIZE / 2,
                        }}
                    />
                </View>
            );
        }

        let component = (
            <ProfilePicture
                userId={userId}
                size={ViewTypes.PROFILE_PICTURE_SIZE}
            />
        );

        if (!fromWebHook) {
            component = (
                <TouchableOpacity onPress={onViewUserProfile}>
                    {component}
                </TouchableOpacity>
            );
        }

        return component;
    }
}
