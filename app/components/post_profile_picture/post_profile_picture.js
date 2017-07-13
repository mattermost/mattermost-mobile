// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PropTypes from 'prop-types';
import {Image, TouchableOpacity, View} from 'react-native';

import MattermostIcon from 'app/components/mattermost_icon';
import ProfilePicture from 'app/components/profile_picture';
import {emptyFunction} from 'app/utils/general';
import webhookIcon from 'assets/images/icons/webhook.jpg';

const PROFILE_PICTURE_SIZE = 32;

function PostProfilePicture(props) {
    const {
        enablePostIconOverride,
        fromWebHook,
        isSystemMessage,
        onViewUserProfile,
        overrideIconUrl,
        theme,
        user
    } = props;
    if (isSystemMessage) {
        return (
            <View>
                <MattermostIcon
                    color={theme.centerChannelColor}
                    height={PROFILE_PICTURE_SIZE}
                    width={PROFILE_PICTURE_SIZE}
                />
            </View>
        );
    } else if (fromWebHook) {
        if (enablePostIconOverride) {
            const icon = overrideIconUrl ? {uri: overrideIconUrl} : webhookIcon;
            return (
                <View>
                    <Image
                        source={icon}
                        style={{
                            height: PROFILE_PICTURE_SIZE,
                            width: PROFILE_PICTURE_SIZE,
                            borderRadius: PROFILE_PICTURE_SIZE / 2
                        }}
                    />
                </View>
            );
        }

        return (
            <ProfilePicture
                user={user}
                size={PROFILE_PICTURE_SIZE}
            />
        );
    }

    return (
        <TouchableOpacity onPress={onViewUserProfile}>
            <ProfilePicture
                user={user}
                size={PROFILE_PICTURE_SIZE}
            />
        </TouchableOpacity>
    );
}

PostProfilePicture.propTypes = {
    enablePostIconOverride: PropTypes.bool,
    fromWebHook: PropTypes.bool,
    isSystemMessage: PropTypes.bool,
    overrideIconUrl: PropTypes.string,
    onViewUserProfile: PropTypes.func,
    theme: PropTypes.object,
    user: PropTypes.object
};

PostProfilePicture.defaultProps = {
    onViewUserProfile: emptyFunction
};

export default PostProfilePicture;
