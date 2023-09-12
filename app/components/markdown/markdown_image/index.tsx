// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useManagedConfig} from '@mattermost/react-native-emm';
import Clipboard from '@react-native-clipboard/clipboard';
import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, type StyleProp, Text, type TextStyle, TouchableWithoutFeedback, View} from 'react-native';
import Animated from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SvgUri} from 'react-native-svg';
import parseUrl from 'url-parse';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ProgressiveImage from '@components/progressive_image';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {GalleryInit} from '@context/gallery';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {useGalleryItem} from '@hooks/gallery';
import {bottomSheet, dismissBottomSheet} from '@screens/navigation';
import {lookupMimeType} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {generateId} from '@utils/general';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {calculateDimensions, getViewPortWidth, isGifTooLarge} from '@utils/images';
import {getMarkdownImageSize} from '@utils/markdown';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {normalizeProtocol, tryOpenURL} from '@utils/url';

import type {GalleryItemType} from '@typings/screens/gallery';

type MarkdownImageProps = {
    disabled?: boolean;
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
    disabled, errorTextStyle, imagesMetadata, isReplyPost = false,
    layoutWidth, layoutHeight, linkDestination, location, postId, source, sourceSize,
}: MarkdownImageProps) => {
    const intl = useIntl();
    const isTablet = useIsTablet();
    const {bottom} = useSafeAreaInsets();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const managedConfig = useManagedConfig<ManagedConfig>();
    const genericFileId = useRef(generateId('uid')).current;
    const metadata = imagesMetadata?.[source] || Object.values(imagesMetadata || {})[0];
    const [failed, setFailed] = useState(isGifTooLarge(metadata));
    const originalSize = getMarkdownImageSize(isReplyPost, isTablet, sourceSize, metadata, layoutWidth, layoutHeight);
    const serverUrl = useServerUrl();
    const galleryIdentifier = `${postId}-${genericFileId}-${location}`;
    const uri = source.startsWith('/') ? serverUrl + source : source;

    const fileInfo = useMemo(() => {
        const link = decodeURIComponent(uri);
        let filename = parseUrl(link.substr(link.lastIndexOf('/'))).pathname.replace('/', '');
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
            uri: link,
            width: originalSize.width,
            height: originalSize.height,
        } as FileInfo;
    }, [originalSize, metadata]);

    const handlePreviewImage = useCallback(() => {
        const item: GalleryItemType = {
            ...fileToGalleryItem(fileInfo),
            mime_type: lookupMimeType(fileInfo.name),
            type: 'image',
        };
        openGalleryAtIndex(galleryIdentifier, 0, [item]);
    }, [fileInfo]);

    const {ref, onGestureEvent, styles} = useGalleryItem(
        galleryIdentifier,
        0,
        handlePreviewImage,
    );

    const {height, width} = calculateDimensions(fileInfo.height, fileInfo.width, layoutWidth || getViewPortWidth(isReplyPost, isTablet));

    const handleLinkPress = useCallback(() => {
        if (linkDestination) {
            const url = normalizeProtocol(linkDestination);

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

            tryOpenURL(url, onError);
        }
    }, [linkDestination]);

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

            bottomSheet({
                closeButtonId: 'close-mardown-image',
                renderContent,
                snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT, bottom)],
                title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
                theme,
            });
        }
    }, [managedConfig, intl.locale, bottom, theme]);

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
    if (height && width) {
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
                    <Animated.View style={[styles, {width, height}, style.container]}>
                        <ProgressiveImage
                            forwardRef={ref}
                            id={fileInfo.id!}
                            imageUri={fileInfo.uri}
                            onError={handleOnError}
                            resizeMode='contain'
                            style={{width, height}}
                        />
                    </Animated.View>
                </TouchableWithoutFeedback>
            );
        }
    }

    if (image && linkDestination && !disabled) {
        image = (
            <TouchableWithFeedback
                onPress={handleLinkPress}
                onLongPress={handleLinkLongPress}
                style={[{width, height}, style.container]}
            >
                <ProgressiveImage
                    id={fileInfo.id!}
                    imageUri={fileInfo.uri}
                    onError={handleOnError}
                    resizeMode='contain'
                    style={{width, height}}
                />
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
