// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, type ImageSource} from 'expo-image';
import React, {useMemo, useRef} from 'react';
import {TouchableWithoutFeedback, useWindowDimensions} from 'react-native';
import Animated from 'react-native-reanimated';

import {View as ViewConstants} from '@constants';
import {GalleryInit} from '@context/gallery';
import {useGalleryItem} from '@hooks/gallery';
import {lookupMimeType} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {generateId} from '@utils/general';
import {isTablet} from '@utils/helpers';
import {calculateDimensions} from '@utils/images';
import {type BestImage, getNearestPoint} from '@utils/opengraph';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {extractFilenameFromUrl, isValidUrl} from '@utils/url';

import type {GalleryItemType} from '@typings/screens/gallery';

type OpengraphImageProps = {
    isReplyPost: boolean;
    layoutWidth?: number;
    location: string;
    metadata: PostMetadata | undefined | null;
    openGraphImages: never[];
    postId: string;
    theme: Theme;
}

const MAX_IMAGE_HEIGHT = 150;
const VIEWPORT_IMAGE_OFFSET = 93;
const VIEWPORT_IMAGE_REPLY_OFFSET = 13;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        imageContainer: {
            alignItems: 'center',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
            borderRadius: 3,
            marginTop: 5,
        },
        image: {
            borderRadius: 3,
        },
    };
});

const getViewPostWidth = (isReplyPost: boolean, deviceHeight: number, deviceWidth: number) => {
    const deviceSize = deviceWidth > deviceHeight ? deviceHeight : deviceWidth;
    const viewPortWidth = deviceSize - VIEWPORT_IMAGE_OFFSET - (isReplyPost ? VIEWPORT_IMAGE_REPLY_OFFSET : 0);
    const tabletOffset = isTablet() ? ViewConstants.TABLET_SIDEBAR_WIDTH : 0;

    return viewPortWidth - tabletOffset;
};

const OpengraphImage = ({isReplyPost, layoutWidth, location, metadata, openGraphImages, postId, theme}: OpengraphImageProps) => {
    const fileId = useRef(generateId('uid')).current;
    const dimensions = useWindowDimensions();
    const style = getStyleSheet(theme);
    const galleryIdentifier = `${postId}-OpenGraphImage-${location}`;

    const bestDimensions = useMemo(() => ({
        height: MAX_IMAGE_HEIGHT,
        width: layoutWidth || getViewPostWidth(isReplyPost, dimensions.height, dimensions.width),
    }), [isReplyPost, dimensions]);
    const bestImage = getNearestPoint(bestDimensions, openGraphImages, 'width', 'height');
    const imageUrl = (bestImage.secure_url || bestImage.url)!;
    const imagesMetadata = metadata?.images;

    let ogImage = secureGetFromRecord(imagesMetadata, imageUrl);

    if (!ogImage) {
        ogImage = openGraphImages.find((i: BestImage) => i.url === imageUrl || i.secure_url === imageUrl);
    }

    // Fallback when the ogImage does not have dimensions but there is a metaImage defined
    const metaImages = imagesMetadata ? Object.values(imagesMetadata) : null;
    if ((!ogImage?.width || !ogImage?.height) && metaImages?.length) {
        ogImage = metaImages[0];
    }

    let imageDimensions = bestDimensions;
    if (ogImage?.width && ogImage?.height) {
        imageDimensions = calculateDimensions(ogImage.height, ogImage.width, (layoutWidth || getViewPostWidth(isReplyPost, dimensions.height, dimensions.width)) - 20);
    }

    const onPress = () => {
        const item: GalleryItemType = {
            id: fileId,
            postId,
            uri: imageUrl,
            width: imageDimensions.width,
            height: imageDimensions.height,
            name: extractFilenameFromUrl(imageUrl) || 'openGraph.png',
            mime_type: lookupMimeType(imageUrl) || 'image/png',
            type: 'image',
            lastPictureUpdate: 0,
        };
        openGalleryAtIndex(galleryIdentifier, 0, [item]);
    };

    const source: ImageSource = {};
    if (isValidUrl(imageUrl)) {
        source.uri = imageUrl;
    }

    const {ref, onGestureEvent, styles} = useGalleryItem(
        galleryIdentifier,
        0,
        onPress,
    );

    const dimensionsStyle = {width: imageDimensions.width, height: imageDimensions.height};
    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <Animated.View style={[styles, style.imageContainer, dimensionsStyle]}>
                <TouchableWithoutFeedback onPress={onGestureEvent}>
                    <Animated.View testID={`OpenGraphImage-${fileId}`}>
                        <Image
                            style={[style.image, dimensionsStyle]}
                            source={source}
                            contentFit='contain'
                            ref={ref}
                            nativeID={`OpenGraphImage-${fileId}`}
                        />
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Animated.View>
        </GalleryInit>
    );
};

export default OpengraphImage;
