// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Image, StyleSheet, TouchableOpacity, View} from 'react-native';

import ProgressiveImage from '@components/progressive_image';
import {useIsTablet} from '@hooks/device';
import {emptyFunction} from '@utils/general';
import {calculateDimensions, getViewPortWidth} from '@utils/images';
import {getYouTubeVideoId, tryOpenURL} from '@utils/url';

type YouTubeProps = {
    isReplyPost: boolean;
    layoutWidth?: number;
    metadata: PostMetadata;
}

const MAX_YOUTUBE_IMAGE_HEIGHT = 202;
const MAX_YOUTUBE_IMAGE_WIDTH = 360;

const styles = StyleSheet.create({
    imageContainer: {
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        marginBottom: 6,
        marginTop: 10,
    },
    image: {
        alignItems: 'center',
        borderRadius: 3,
        justifyContent: 'center',
        marginVertical: 1,
    },
    playButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

const YouTube = ({isReplyPost, layoutWidth, metadata}: YouTubeProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const link = metadata.embeds![0].url;
    const videoId = getYouTubeVideoId(link);
    const dimensions = calculateDimensions(
        MAX_YOUTUBE_IMAGE_HEIGHT,
        MAX_YOUTUBE_IMAGE_WIDTH,
        layoutWidth || getViewPortWidth(isReplyPost, isTablet),
    );

    const playYouTubeVideo = useCallback(() => {
        const onError = () => {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                intl.formatMessage({
                    id: 'mobile.link.error.text',
                    defaultMessage: 'Unable to open the link.',
                }),
            );
        };

        tryOpenURL(link, onError);
    }, [link, intl.locale]);

    let imgUrl;
    if (metadata.images) {
        imgUrl = Object.keys(metadata.images)[0];
    }

    if (!imgUrl) {
        // Fallback to default YouTube thumbnail if available
        imgUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }

    return (
        <TouchableOpacity
            style={[styles.imageContainer, {height: dimensions.height}]}
            onPress={playYouTubeVideo}
        >
            <ProgressiveImage
                id={imgUrl}
                isBackgroundImage={true}
                imageUri={imgUrl}
                style={[styles.image, dimensions]}
                resizeMode='cover'
                onError={emptyFunction}
            >
                <View style={styles.playButton}>
                    <Image source={require('@assets/images/icons/youtube-play-icon.png')}/>
                </View>
            </ProgressiveImage>
        </TouchableOpacity>
    );
};

export default React.memo(YouTube);
