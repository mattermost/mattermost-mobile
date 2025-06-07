// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ImageBackground} from 'expo-image';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, TouchableOpacity} from 'react-native';

import {useIsTablet} from '@hooks/device';
import {calculateDimensions, getViewPortWidth} from '@utils/images';
import {changeOpacity} from '@utils/theme';
import {getYouTubeVideoId, tryOpenURL} from '@utils/url';
import {onOpenLinkError} from '@utils/url/links';

import YouTubeLogo from './youtube_logo';

type YouTubeProps = {
    isReplyPost: boolean;
    layoutWidth?: number;
    metadata: PostMetadata | undefined | null;
}

const MAX_YOUTUBE_IMAGE_HEIGHT = 280;
const MAX_YOUTUBE_IMAGE_WIDTH = 500;

const styles = StyleSheet.create({
    imageContainer: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        borderRadius: 4,
        marginBottom: 6,
        marginTop: 10,
    },
    image: {
        alignItems: 'center',
        borderRadius: 4,
        justifyContent: 'center',
        backgroundColor: changeOpacity('#000', 0.24),
    },
    shadow: {
        elevation: 3,
        shadowColor: changeOpacity('#000', 0.8),
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 1,
        shadowRadius: 3,
    },
});

const YouTube = ({isReplyPost, layoutWidth, metadata}: YouTubeProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const link = metadata?.embeds![0].url;
    const videoId = getYouTubeVideoId(link);
    const dimensions = calculateDimensions(
        MAX_YOUTUBE_IMAGE_HEIGHT,
        MAX_YOUTUBE_IMAGE_WIDTH,
        layoutWidth || (getViewPortWidth(isReplyPost, isTablet) - 6),
    );

    const playYouTubeVideo = useCallback(() => {
        if (!link) {
            return;
        }

        const onError = () => {
            onOpenLinkError(intl);
        };

        tryOpenURL(link, onError);
    }, [link, intl]);

    let imgUrl;
    if (metadata?.images) {
        imgUrl = Object.keys(metadata.images)[0];
    }

    if (!imgUrl) {
        // Fallback to default YouTube thumbnail if available
        imgUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    if (!link) {
        return null;
    }

    return (
        <TouchableOpacity
            style={[styles.imageContainer, {height: dimensions.height, width: dimensions.width}]}
            onPress={playYouTubeVideo}
        >
            <ImageBackground
                contentFit='cover'
                style={[styles.image, dimensions]}
                source={{uri: imgUrl}}
            >
                <YouTubeLogo style={styles.shadow}/>
            </ImageBackground>
        </TouchableOpacity>
    );
};

export default React.memo(YouTube);
