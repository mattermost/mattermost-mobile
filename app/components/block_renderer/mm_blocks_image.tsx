// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {type ImageLoadEventData} from 'expo-image';
import React, {useCallback, useContext, useMemo, useRef, useState} from 'react';
import {Pressable, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {SvgUri} from 'react-native-svg';

import ExpoImage from '@components/expo_image';
import ExternalImage from '@components/external_image';
import {isSVGImage} from '@components/external_image/is_svg_image';
import FileIcon from '@components/files/file_icon';
import {GalleryInit} from '@context/gallery';
import {useIsTablet} from '@hooks/device';
import {useGalleryItem} from '@hooks/gallery';
import {lookupMimeType} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {getViewPortWidth, isGifTooLarge} from '@utils/images';
import {urlSafeBase64Encode} from '@utils/security';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {extractFilenameFromUrl, isValidUrl} from '@utils/url';

import {MmBlocksInteractionContext, MmBlocksLayoutWidthContext, MmBlocksRenderContext} from './context';
import {
    computeMmBlocksImageLayout,
    refineMmBlocksImageLayoutFromIntrinsic,
    type MmBlocksImageLayout,
} from './image_utils';

import type {GalleryItemType} from '@typings/screens/gallery';

export type MmBlocksImageProps = {
    altText?: string;
    caps: {maxWidth?: number; maxHeight?: number};
    imageMetadata?: PostImage;
    imageStyle?: 'default' | 'person';
    imageUrl: string;
    theme: Theme;
};

type MmBlocksImageContentProps = MmBlocksImageProps & {
    displaySrc: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    errorFrame: {
        alignItems: 'center',
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        borderWidth: 1,
        justifyContent: 'center',
    },
}));

const MmBlocksImageContent = ({
    altText,
    caps,
    displaySrc,
    imageMetadata,
    imageStyle = 'default',
    imageUrl,
    theme,
}: MmBlocksImageContentProps) => {
    const layoutWidth = useContext(MmBlocksLayoutWidthContext);
    const {location, postId} = useContext(MmBlocksRenderContext)!;
    const interactionsEnabled = useContext(MmBlocksInteractionContext);
    const galleryIdentifier = `${postId}-MmBlocksImage-${location}`;
    const isTablet = useIsTablet();
    const viewPortWidth = getViewPortWidth(false, isTablet);
    const style = getStyleSheet(theme);
    const [loadError, setLoadError] = useState(false);
    const [intrinsicSize, setIntrinsicSize] = useState<{width: number; height: number} | undefined>(undefined);

    const isSvg = isSVGImage(imageMetadata, imageUrl);

    const layout = useMemo((): MmBlocksImageLayout => {
        if (intrinsicSize && !imageMetadata?.width && !imageMetadata?.height) {
            return refineMmBlocksImageLayoutFromIntrinsic(
                intrinsicSize.width,
                intrinsicSize.height,
                caps,
                layoutWidth,
                viewPortWidth,
            );
        }

        return computeMmBlocksImageLayout(caps, layoutWidth, imageMetadata, viewPortWidth);
    }, [caps, imageMetadata, intrinsicSize, layoutWidth, viewPortWidth]);

    const fileId = useRef(`uid-mm-blocks-image-${urlSafeBase64Encode(imageUrl)}`);

    const dimensionsStyle = useMemo(() => ({
        width: layout.width,
        height: layout.height,
    }), [layout.height, layout.width]);

    const imageBorderRadius = imageStyle === 'person' ? layout.width / 2 : 3;

    const onPress = useCallback(() => {
        const item: GalleryItemType = {
            id: fileId.current,
            postId,
            uri: displaySrc,
            width: layout.galleryWidth,
            height: layout.galleryHeight,
            name: altText || extractFilenameFromUrl(imageUrl) || 'image.png',
            mime_type: lookupMimeType(imageUrl) || 'image/png',
            type: 'image',
            lastPictureUpdate: 0,
            cacheKey: fileId.current,
        };
        openGalleryAtIndex(galleryIdentifier, 0, [item]);
    }, [altText, displaySrc, galleryIdentifier, imageUrl, layout.galleryHeight, layout.galleryWidth, postId]);

    const {ref, onGestureEvent, styles: galleryStyles} = useGalleryItem(
        galleryIdentifier,
        0,
        onPress,
    );

    const onError = useCallback(() => {
        setLoadError(true);
    }, []);

    const onLoad = useCallback((event: ImageLoadEventData) => {
        const intrinsicWidth = event.source.width;
        const intrinsicHeight = event.source.height;
        if (!intrinsicWidth || !intrinsicHeight) {
            return;
        }
        if (imageMetadata?.width && imageMetadata?.height) {
            return;
        }
        setIntrinsicSize({width: intrinsicWidth, height: intrinsicHeight});
    }, [imageMetadata?.height, imageMetadata?.width]);

    if (!isValidUrl(imageUrl) || !displaySrc || loadError || (imageMetadata && isGifTooLarge(imageMetadata))) {
        return (
            <View style={[style.errorFrame, dimensionsStyle]}>
                <FileIcon failed={true}/>
            </View>
        );
    }

    const renderImage = () => {
        if (isSvg) {
            return (
                <SvgUri
                    uri={displaySrc}
                    width={layout.width}
                    height={layout.height}
                    style={[dimensionsStyle, {borderRadius: imageBorderRadius}]}
                    onError={onError}
                />
            );
        }

        return (
            <ExpoImage
                id={fileId.current}
                ref={ref}
                nativeID={`MmBlocksImage-${fileId.current}`}
                source={{uri: displaySrc}}
                style={[dimensionsStyle, {borderRadius: imageBorderRadius}]}
                contentFit={imageStyle === 'person' ? 'cover' : 'contain'}
                onError={onError}
                onLoad={onLoad}
            />
        );
    };

    const imageContent = interactionsEnabled ? (
        <Pressable
            onPress={onGestureEvent}
            style={({pressed}) => pressed && {opacity: 0.72}}
            accessibilityRole='imagebutton'
            accessibilityLabel={altText}
        >
            {renderImage()}
        </Pressable>
    ) : (
        renderImage()
    );

    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <Animated.View style={[galleryStyles, dimensionsStyle]}>
                {imageContent}
            </Animated.View>
        </GalleryInit>
    );
};

const MmBlocksImage = ({imageUrl, imageMetadata, ...contentProps}: MmBlocksImageProps) => {
    return (
        <ExternalImage
            src={imageUrl}
            imageMetadata={imageMetadata}
        >
            {(displaySrc: string) => (
                <MmBlocksImageContent
                    {...contentProps}
                    displaySrc={displaySrc}
                    imageMetadata={imageMetadata}
                    imageUrl={imageUrl}
                />
            )}
        </ExternalImage>
    );
};

export default MmBlocksImage;
