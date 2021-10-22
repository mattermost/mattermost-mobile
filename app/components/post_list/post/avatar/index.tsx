// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {ReactNode, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import SystemAvatar from '@components/system_avatar';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {View as ViewConstant} from '@constants';
import {MM_TABLES, SYSTEM_IDENTIFIERS} from '@constants/database';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {showModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

import type {Client} from '@client/rest';
import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';
import type {ImageSource} from 'react-native-vector-icons/Icon';

type AvatarProps = {
    author: UserModel;
    enablePostIconOverride?: boolean;
    isAutoReponse: boolean;
    isSystemPost: boolean;
    pendingPostStyle?: StyleProp<ViewStyle>;
    post: PostModel;
}

const style = StyleSheet.create({
    buffer: {
        marginRight: Platform.select({android: 2, ios: 3}),
    },
    profilePictureContainer: {
        marginBottom: 5,
        marginLeft: 12,
        marginRight: Platform.select({android: 11, ios: 10}),
        marginTop: 10,
    },
});

const Avatar = ({author, enablePostIconOverride, isAutoReponse, isSystemPost, pendingPostStyle, post}: AvatarProps) => {
    const closeButton = useRef<ImageSource>();
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing, client is not set
    }

    if (isSystemPost && !isAutoReponse && !author.isBot) {
        return (<SystemAvatar theme={theme}/>);
    }

    const fromWebHook = post.props?.from_webhook === 'true';
    const iconOverride = enablePostIconOverride && post.props?.use_user_icon !== 'true';
    if (fromWebHook && iconOverride) {
        const isEmoji = Boolean(post.props?.override_icon_emoji);
        const frameSize = ViewConstant.PROFILE_PICTURE_SIZE;
        const pictureSize = isEmoji ? ViewConstant.PROFILE_PICTURE_EMOJI_SIZE : ViewConstant.PROFILE_PICTURE_SIZE;
        const borderRadius = isEmoji ? 0 : ViewConstant.PROFILE_PICTURE_SIZE / 2;
        const overrideIconUrl = client?.getAbsoluteUrl(post.props?.override_icon_url);

        let iconComponent: ReactNode;
        if (overrideIconUrl) {
            const source = {uri: overrideIconUrl};
            iconComponent = (
                <FastImage
                    source={source}
                    style={{
                        height: pictureSize,
                        width: pictureSize,
                    }}
                />
            );
        } else {
            iconComponent = (
                <CompassIcon
                    name='webhook'
                    size={32}
                />
            );
        }

        return (
            <View style={[style.profilePictureContainer, pendingPostStyle]}>
                <View
                    style={[{
                        borderRadius,
                        overflow: 'hidden',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: frameSize,
                        width: frameSize,
                    }, style.buffer]}
                >
                    {iconComponent}
                </View>
            </View>
        );
    }

    const onViewUserProfile = preventDoubleTap(() => {
        const screen = 'UserProfile';
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {author};

        if (!closeButton.current) {
            closeButton.current = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: closeButton.current,
                    testID: 'close.settings.button',
                }],
            },
        };

        Keyboard.dismiss();
        showModal(screen, title, passProps, options);
    });

    let component = (
        <ProfilePicture
            author={author}
            size={ViewConstant.PROFILE_PICTURE_SIZE}
            iconSize={24}
            showStatus={!isAutoReponse}
            testID='post_profile_picture.profile_picture'
        />
    );

    if (!fromWebHook) {
        component = (
            <TouchableWithFeedback
                onPress={onViewUserProfile}
                type={'opacity'}
            >
                {component}
            </TouchableWithFeedback>
        );
    }

    return (
        <View style={[style.profilePictureContainer, pendingPostStyle]}>
            {component}
        </View>
    );
};

const withPost = withObservables(['post'], ({database, post}: {post: PostModel} & WithDatabaseArgs) => {
    const enablePostIconOverride = database.get<SystemModel>(MM_TABLES.SERVER.SYSTEM).findAndObserve(SYSTEM_IDENTIFIERS.CONFIG).pipe(
        switchMap((cfg) => of$(cfg.value.EnablePostIconOverride === 'true')),
    );

    return {
        author: post.author.observe(),
        enablePostIconOverride,
    };
});

export default withDatabase(withPost(React.memo(Avatar)));
