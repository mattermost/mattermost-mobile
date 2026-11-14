// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import {type ImageLoadEventData} from 'expo-image';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Platform, type StyleProp, Image as RNImage, Text, type TextStyle, TouchableWithoutFeedback, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {SvgUri} from 'react-native-svg';
import parseUrl from 'url-parse';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ProgressiveImage from '@components/progressive_image';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {GalleryInit} from '@context/gallery';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {useGalleryItem} from '@hooks/gallery';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {lookupMimeType} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {calculateDimensions, getDataImageDisplaySize, getDataImageExtension, getDataImageFileId, getDataImageMimeType, getViewPortWidth, isDataImageUri, isGifTooLarge} from '@utils/images';
import {getMarkdownImageSize, removeImageProxyForKey} from '@utils/markdown';
import {urlSafeBase64Encode} from '@utils/security';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {secureGetFromRecord} from '@utils/types';
import {normalizeProtocol, safeDecodeURIComponent, tryOpenURL} from '@utils/url';
import {onOpenLinkError} from '@utils/url/links';

import type {GalleryItemType} from '@typings/screens/gallery';

type MarkdownImageProps = {
    disabled?: boolean;
    isInline?: boolean;
    errorTextStyle: StyleProp<TextStyle>;
    imagesMetadata: Record<string, PostImage | undefined>;
    isReplyPost?: boolean;
    linkDestination?: string;
    layoutHeight?: number;
    layoutWidth?: number;
    location?: string;
    postId: string;
    source: string;
    sourceSize?: {width?: number; height?: number};
    theme: Theme;
}

const ANDROID_MAX_HEIGHT = 4096;
const ANDROID_MAX_WIDTH = 4096;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    bottomSheet: {
        flex: 1,
    },
    brokenImageIcon: {
        width: 24,
        height: 24,
    },
    blockContainer: {
        marginVertical: 0,
        top: 0,
    },
    container: {
        marginVertical: 5,
        top: 5,
    },
    svg: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.06),
        borderRadius: 8,
        flex: 1,
    },
}));

const MarkdownImage = ({
    disabled,
    errorTextStyle,
    imagesMetadata,
    isInline = true,
    isReplyPost = false,
    layoutWidth,
    layoutHeight,
    linkDestination,
    location,
    postId,
    source,
    sourceSize,
    theme,
}: MarkdownImageProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const style = getStyleSheet(theme);
    const managedConfig = useManagedConfig<ManagedConfig>();
    const isDataImage = isDataImageUri(source);
    const sourceKey = isDataImage ? '' : removeImageProxyForKey(source);

    // Pattern suggested in https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents
    const genericFileRef = useRef<string | null>(null);
    if (genericFileRef.current === null) {
        genericFileRef.current = isDataImage ? getDataImageFileId(source) : `uid-${urlSafeBase64Encode(sourceKey)}`;
    }
    const genericFileId = genericFileRef.current;

    const metadata = isDataImage ? undefined : (secureGetFromRecord(imagesMetadata, sourceKey) || Object.values(imagesMetadata || {})[0]);
    const [failed, setFailed] = useState(() => isGifTooLarge(metadata));

    const declaredSize = useMemo(() => {
        if (sourceSize?.width && sourceSize?.height) {
            return {width: sourceSize.width, height: sourceSize.height};
        }
        return undefined;
    }, [sourceSize?.width, sourceSize?.height]);
    const [intrinsicSize, setIntrinsicSize] = useState<{width: number; height: number} | undefined>(declaredSize);
    const [sizeLookupFailed, setSizeLookupFailed] = useState(false);
    const dataImageSize = useMemo(() => {
        const width = sourceSize?.width;
        const height = sourceSize?.height;
        if (width && height) {
            return {width, height};
        }
        if (!intrinsicSize) {
            return undefined;
        }
        if (width) {
            return {width, height: (width * intrinsicSize.height) / intrinsicSize.width};
        }
        if (height) {
            return {width: (height * intrinsicSize.width) / intrinsicSize.height, height};
        }
        return intrinsicSize;
    }, [intrinsicSize, sourceSize?.width, sourceSize?.height]);
    const handleLoad = useCallback((event: ImageLoadEventData) => {
        const width = event?.source?.width;
        const height = event?.source?.height;
        if (width && height) {
            setIntrinsicSize((prev) => (prev?.width === width && prev?.height === height ? prev : {width, height}));
        }
    }, []);
    const serverUrl = useServerUrl();
    const galleryIdentifier = `${postId}-${genericFileId}-${location}`;

    const fileInfo = useMemo(() => {
        if (isDataImage) {
            const extension = getDataImageExtension(source);
            const mimeType = getDataImageMimeType(source);
            const originalSize = dataImageSize ?? getMarkdownImageSize(isReplyPost, isTablet, sourceSize, undefined, layoutWidth, layoutHeight);
            return {
                id: genericFileId,
                name: `inline-image.${extension}`,
                extension,
                has_preview_image: true,
                mime_type: mimeType,
                post_id: postId,
                uri: source,
                width: originalSize.width,
                height: originalSize.height,
            } as FileInfo;
        }

        const uri = source.startsWith('/') ? serverUrl + source : source;
        const originalSize = getMarkdownImageSize(isReplyPost, isTablet, sourceSize, metadata, layoutWidth, layoutHeight);

        const decodedLink = safeDecodeURIComponent(uri);
        let filename = parseUrl(decodedLink.substr(decodedLink.lastIndexOf('/'))).pathname.replace('/', '');
        let extension = metadata?.format || filename.split('.').pop();
        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
            extension = ext;
        }

        return {
            id: genericFileId,
            name: filename,
            extension,
            has_preview_image: true,
            mime_type: lookupMimeType(filename),
            post_id: postId,
            uri,
            width: originalSize.width,
            height: originalSize.height,
        } as FileInfo;
    }, [source, serverUrl, isReplyPost, isTablet, sourceSize, metadata, layoutWidth, layoutHeight, genericFileId, postId, isDataImage, dataImageSize]);

    const useNativeImage = isDataImage && Platform.OS === 'android' && fileInfo.extension !== 'svg';

    const handlePreviewImage = useCallback(() => {
        const item: GalleryItemType = {
            ...fileToGalleryItem(fileInfo, undefined, undefined, 0, fileInfo.id),
            mime_type: lookupMimeType(fileInfo.name),
            type: 'image',
        };
        openGalleryAtIndex(galleryIdentifier, 0, [item]);
    }, [fileInfo, galleryIdentifier]);

    const {ref, onGestureEvent, styles} = useGalleryItem(
        galleryIdentifier,
        0,
        handlePreviewImage,
    );

    const containerStyle = useMemo(() => {
        return isInline ? style.container : [style.container, style.blockContainer];
    }, [isInline, style.blockContainer, style.container]);

    const {height, width} = (isDataImage && dataImageSize) ?
        getDataImageDisplaySize(dataImageSize.width, dataImageSize.height, layoutWidth || getViewPortWidth(isReplyPost, isTablet)) :
        calculateDimensions(fileInfo.height, fileInfo.width, layoutWidth || getViewPortWidth(isReplyPost, isTablet));

    useEffect(() => {
        if (!isDataImage || fileInfo.extension === 'svg') {
            return undefined;
        }
        let cancelled = false;
        const handleSize = (w: number, h: number) => {
            if (!cancelled && w > 0 && h > 0) {
                setIntrinsicSize({width: w, height: h});
            }
        };
        RNImage.getSize(source, handleSize, () => {
            if (!cancelled) {
                setSizeLookupFailed(true);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [isDataImage, fileInfo.extension, source]);

    const progressiveImageStyle = useMemo(() => ({width, height}), [width, height]);

    const handleLinkPress = useCallback(() => {
        if (linkDestination) {
            const url = normalizeProtocol(linkDestination);

            tryOpenURL(url, () => onOpenLinkError(intl));
        }
    }, [intl, linkDestination]);

    const handleLinkLongPress = useCallback(() => {
        if (managedConfig?.copyAndPasteProtection !== 'true') {
            const renderContent = () => {
                return (
                    <View
                        testID='at_mention.bottom_sheet'
                        style={style.bottomSheet}
                    >
                        <SlideUpPanelItem
                            leftIcon='content-copy'
                            onPress={() => {
                                dismissBottomSheet();
                                Clipboard.setString(linkDestination || source);
                            }}
                            testID='at_mention.bottom_sheet.copy_url'
                            text={intl.formatMessage({id: 'mobile.markdown.link.copy_url', defaultMessage: 'Copy URL'})}
                        />
                        <SlideUpPanelItem
                            destructive={true}
                            leftIcon='cancel'
                            onPress={() => {
                                dismissBottomSheet();
                            }}
                            testID='at_mention.bottom_sheet.cancel'
                            text={intl.formatMessage({id: 'mobile.post.cancel', defaultMessage: 'Cancel'})}
                        />
                    </View>
                );
            };

            bottomSheet(renderContent, [1, bottomSheetSnapPoint(2, ITEM_HEIGHT)]);
        }
    }, [managedConfig?.copyAndPasteProtection, intl, style.bottomSheet, linkDestination, source]);

    const handleOnError = useCallback(() => {
        setFailed(true);
    }, []);

    if (failed) {
        return (
            <CompassIcon
                color={theme.centerChannelColor}
                name='file-image-broken-outline-large'
                size={24}
            />
        );
    }

    let image;

    const waitingForDataImageSize = isDataImage && fileInfo.extension !== 'svg' && !dataImageSize && !sizeLookupFailed;
    if (height && width && !waitingForDataImageSize) {
        if (Platform.OS === 'android' && (height > ANDROID_MAX_HEIGHT || width > ANDROID_MAX_WIDTH)) {
            // Android has a cap on the max image size that can be displayed
            return (
                <Text style={[errorTextStyle, style.container]}>
                    <FormattedText
                        id='mobile.markdown.image.too_large'
                        defaultMessage='Image exceeds max dimensions of {maxWidth} by {maxHeight}:'
                        values={{
                            maxWidth: ANDROID_MAX_WIDTH,
                            maxHeight: ANDROID_MAX_HEIGHT,
                        }}
                    />
                    {' '}
                </Text>
            );
        } else if (fileInfo.extension === 'svg') {
            image = (
                <SvgUri
                    uri={fileInfo.uri!}
                    style={{flex: 1, backgroundColor: changeOpacity(theme.centerChannelColor, 0.06), borderRadius: 8}}
                    width={width}
                    height={height}
                    onError={handleOnError}
                />
            );
        } else {
            image = (
                <TouchableWithoutFeedback
                    disabled={disabled}
                    onLongPress={handleLinkLongPress}
                    onPress={onGestureEvent}
                >
                    <Animated.View
                        style={[styles, {width, height}, containerStyle]}
                    >
                        {useNativeImage ? (
                            <Animated.Image
                                ref={ref}
                                source={{uri: fileInfo.uri}}
                                style={progressiveImageStyle}
                                resizeMode='contain'
                                onError={handleOnError}
                            />
                        ) : (
                            <ProgressiveImage
                                forwardRef={ref}
                                id={fileInfo.id!}
                                imageUri={fileInfo.uri}
                                onError={handleOnError}
                                onLoad={isDataImage ? handleLoad : undefined}
                                contentFit='contain'
                                style={progressiveImageStyle}
                                theme={theme}
                            />
                        )}
                    </Animated.View>
                </TouchableWithoutFeedback>
            );
        }
    }

    if (image && linkDestination && (!disabled || !isInline)) {
        image = (
            <TouchableWithFeedback
                onPress={handleLinkPress}
                onLongPress={handleLinkLongPress}
                style={[{width, height}, containerStyle]}
            >
                {useNativeImage ? (
                    <RNImage
                        source={{uri: fileInfo.uri}}
                        style={progressiveImageStyle}
                        resizeMode='contain'
                        onError={handleOnError}
                    />
                ) : (
                    <ProgressiveImage
                        id={fileInfo.id!}
                        imageUri={fileInfo.uri}
                        onError={handleOnError}
                        onLoad={isDataImage ? handleLoad : undefined}
                        contentFit='contain'
                        style={progressiveImageStyle}
                        theme={theme}
                    />
                )}
            </TouchableWithFeedback>
        );
    }

    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <Animated.View testID='markdown_image'>
                {image}
            </Animated.View>
        </GalleryInit>
    );
};

export default MarkdownImage;
