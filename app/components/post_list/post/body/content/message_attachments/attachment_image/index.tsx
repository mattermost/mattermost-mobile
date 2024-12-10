// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useState} from 'react';
import {TouchableWithoutFeedback, View} from 'react-native';
import Animated from 'react-native-reanimated';

import FileIcon from '@components/files/file_icon';
import ProgressiveImage from '@components/progressive_image';
import {GalleryInit} from '@context/gallery';
import {useIsTablet} from '@hooks/device';
import {useGalleryItem} from '@hooks/gallery';
import {lookupMimeType} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {generateId} from '@utils/general';
import {isGifTooLarge, calculateDimensions, getViewPortWidth} from '@utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {extractFilenameFromUrl, isValidUrl} from '@utils/url';

import type {GalleryItemType} from '@typings/screens/gallery';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        attachmentMargin: {
            marginTop: 2.5,
            marginLeft: 2.5,
            marginBottom: 5,
            marginRight: 5,
        },
        container: {marginTop: 5},
        imageContainer: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderWidth: 1,
            borderRadius: 2,
            flex: 1,
        },
        image: {
            alignItems: 'center',
            borderRadius: 3,
            justifyContent: 'center',
            marginVertical: 1,
        },
    };
});

export type Props = {
    imageMetadata: PostImage;
    imageUrl: string;
    layoutWidth?: number;
    location: string;
    postId: string;
    theme: Theme;
}

const AttachmentImage = ({imageUrl, imageMetadata, layoutWidth, location, postId, theme}: Props) => {
    const galleryIdentifier = `${postId}-AttachmentImage-${location}`;
    const [error, setError] = useState(false);
    const fileId = useRef(generateId('uid')).current;
    const isTablet = useIsTablet();
    const {height, width} = calculateDimensions(imageMetadata.height, imageMetadata.width, layoutWidth || getViewPortWidth(false, isTablet, true));
    const style = getStyleSheet(theme);

    const onError = useCallback(() => {
        setError(true);
    }, []);

    const onPress = () => {
        const item: GalleryItemType = {
            id: fileId,
            postId,
            uri: imageUrl,
            width: imageMetadata.width,
            height: imageMetadata.height,
            name: extractFilenameFromUrl(imageUrl) || 'attachmentImage.png',
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

    if (error || !isValidUrl(imageUrl) || isGifTooLarge(imageMetadata)) {
        return (
            <View style={[style.imageContainer, {height, borderWidth: 1, borderColor: changeOpacity(theme.centerChannelColor, 0.2)}]}>
                <View style={[style.image, {width, height}]}>
                    <FileIcon
                        failed={true}
                    />
                </View>
            </View>
        );
    }

    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <Animated.View style={[styles, style.container, {width}]}>
                <TouchableWithoutFeedback onPress={onGestureEvent}>
                    <Animated.View testID={`attachmentImage-${fileId}`}>
                        <ProgressiveImage
                            forwardRef={ref}
                            id={fileId}
                            imageStyle={style.attachmentMargin}
                            imageUri={imageUrl}
                            onError={onError}
                            contentFit='contain'
                            style={{height, width}}
                        />
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </GalleryInit>
    );
};

export default AttachmentImage;
