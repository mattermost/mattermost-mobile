// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import Animated from 'react-native-reanimated';

import {getRedirectLocation} from '@actions/remote/general';
import FileIcon from '@components/files/file_icon';
import ProgressiveImage from '@components/progressive_image';
import {GalleryInit} from '@context/gallery';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import useDidUpdate from '@hooks/did_update';
import {useGalleryItem} from '@hooks/gallery';
import {lookupMimeType} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {generateId} from '@utils/general';
import {calculateDimensions, getViewPortWidth, isGifTooLarge} from '@utils/images';
import {changeOpacity} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {extractFilenameFromUrl, isImageLink, isValidUrl} from '@utils/url';

import type {GalleryItemType} from '@typings/screens/gallery';

type ImagePreviewProps = {
    expandedLink?: string;
    isReplyPost: boolean;
    link: string;
    layoutWidth?: number;
    location: string;
    metadata: PostMetadata | undefined | null;
    postId: string;
    theme: Theme;
}

const style = StyleSheet.create({
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
});

const ImagePreview = ({expandedLink, isReplyPost, layoutWidth, link, location, metadata, postId, theme}: ImagePreviewProps) => {
    const galleryIdentifier = `${postId}-ImagePreview-${location}`;
    const [error, setError] = useState(false);
    const serverUrl = useServerUrl();
    const fileId = useRef(generateId('uid')).current;
    const [imageUrl, setImageUrl] = useState(expandedLink || link);
    const isTablet = useIsTablet();
    const imageProps = secureGetFromRecord(metadata?.images, link);
    const dimensions = calculateDimensions(imageProps?.height, imageProps?.width, layoutWidth || getViewPortWidth(isReplyPost, isTablet));

    const onError = useCallback(() => {
        setError(true);
    }, []);

    const onPress = () => {
        const item: GalleryItemType = {
            id: fileId,
            postId,
            uri: imageUrl,
            width: imageProps?.width || 0,
            height: imageProps?.height || 0,
            name: extractFilenameFromUrl(imageUrl) || 'imagePreview.png',
            mime_type: lookupMimeType(imageUrl) || 'image/png',
            type: 'image',
            lastPictureUpdate: 0,
        };
        openGalleryAtIndex(galleryIdentifier, 0, [item]);
    };

    const {ref, onGestureEvent, styles} = useGalleryItem(
        galleryIdentifier,
        0,
        onPress,
    );

    useEffect(() => {
        if (!isImageLink(link) && expandedLink === undefined) {
            getRedirectLocation(serverUrl, link);
        }
    }, [link]);

    useDidUpdate(() => {
        if (expandedLink) {
            setImageUrl(expandedLink);
        } else if (link !== imageUrl) {
            setImageUrl(link);
        }
    }, [link]);

    useEffect(() => {
        if (expandedLink && expandedLink !== imageUrl) {
            setImageUrl(expandedLink);
        }
    }, [expandedLink]);

    if (error || !isValidUrl(expandedLink || link) || isGifTooLarge(imageProps)) {
        return (
            <View style={[style.imageContainer, {height: dimensions.height, borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.2)}]}>
                <View style={[style.image, {width: dimensions.width, height: dimensions.height}]}>
                    <FileIcon
                        failed={true}
                    />
                </View>
            </View>
        );
    }

    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <Animated.View style={[styles, style.imageContainer, {height: dimensions.height}]}>
                <TouchableWithoutFeedback onPress={onGestureEvent}>
                    <Animated.View testID={`ImagePreview-${fileId}`}>
                        <ProgressiveImage
                            forwardRef={ref}
                            id={fileId}
                            imageUri={imageUrl}
                            onError={onError}
                            contentFit='contain'
                            style={[style.image, {width: dimensions.width, height: dimensions.height}]}
                        />
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </GalleryInit>
    );
};

export default React.memo(ImagePreview);
