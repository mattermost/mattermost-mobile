// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {DeviceEventEmitter, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';
import {SafeAreaView, Edge} from 'react-native-safe-area-context';

import {Events} from '@constants';
import {GALLERY_FOOTER_HEIGHT} from '@constants/gallery';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import Actions from './actions';
import Avatar from './avatar';
import CopyPublicLink from './copy_public_link';
import Details from './details';
import DownloadWithAction from './download_with_action';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel;
    canDownloadFiles: boolean;
    channelName: string;
    currentUserId: string;
    enablePostIconOverride: boolean;
    enablePostUsernameOverride: boolean;
    enablePublicLink: boolean;
    hideActions: boolean;
    isDirectChannel: boolean;
    item: GalleryItemType;
    post?: PostModel;
    style: StyleProp<ViewStyle>;
    teammateNameDisplay: string;
}

const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);
const edges: Edge[] = ['left', 'right', 'bottom'];
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity('#000', 0.6),
        borderTopColor: changeOpacity('#fff', 0.4),
        borderTopWidth: 1,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        height: GALLERY_FOOTER_HEIGHT,
        paddingHorizontal: 20,
    },
    details: {flex: 3, flexDirection: 'row'},
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    title: {
        ...typography('Heading', 300),
        color: 'white',
    },
});

const Footer = ({
    author, canDownloadFiles, channelName, currentUserId,
    enablePostIconOverride, enablePostUsernameOverride, enablePublicLink,
    hideActions, isDirectChannel, item, post, style, teammateNameDisplay,
}: Props) => {
    const showActions = !hideActions && Boolean(item.id) && !item.id?.startsWith('uid');
    const [action, setAction] = useState<GalleryAction>('none');

    let overrideIconUrl;
    if (enablePostIconOverride && post?.props?.use_user_icon !== 'true' && post?.props?.override_icon_url) {
        overrideIconUrl = post.props.override_icon_url;
    }

    let userDisplayName;
    if (enablePostUsernameOverride && post?.props?.override_username) {
        userDisplayName = post.props.override_username as string;
    } else {
        userDisplayName = displayUsername(author, undefined, teammateNameDisplay);
    }

    const handleCopyLink = useCallback(() => {
        setAction('copying');
    }, []);

    const handleDownload = useCallback(async () => {
        setAction('downloading');
    }, []);

    const handleShare = useCallback(() => {
        setAction('sharing');
    }, []);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.GALLERY_ACTIONS, (value: GalleryAction) => {
            setAction(value);
        });

        return () => listener.remove();
    }, []);

    return (
        <AnimatedSafeAreaView
            mode='padding'
            edges={edges}
            style={[style]}
        >
            {['downloading', 'sharing'].includes(action) &&
                <DownloadWithAction
                    action={action}
                    item={item}
                    setAction={setAction}
                />
            }
            {action === 'copying' &&
            <CopyPublicLink
                item={item}
                setAction={setAction}
            />
            }
            <View style={styles.container}>
                <View style={styles.details}>
                    <Avatar
                        authorId={author?.id}
                        overrideIconUrl={overrideIconUrl}
                    />
                    <Details
                        channelName={channelName}
                        isDirectChannel={isDirectChannel}
                        ownPost={author?.id === currentUserId}
                        userDisplayName={userDisplayName}
                    />
                </View>
                {showActions &&
                <Actions
                    disabled={action !== 'none'}
                    canDownloadFiles={canDownloadFiles}
                    enablePublicLinks={enablePublicLink}
                    fileId={item.id!}
                    onCopyPublicLink={handleCopyLink}
                    onDownload={handleDownload}
                    onShare={handleShare}
                />
                }
            </View>
        </AnimatedSafeAreaView>
    );
};

export default Footer;
