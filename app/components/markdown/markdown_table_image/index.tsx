// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useCallback, useRef, useState} from 'react';
import {StyleSheet, TouchableWithoutFeedback, View} from 'react-native';
import Animated from 'react-native-reanimated';
import parseUrl from 'url-parse';

import CompassIcon from '@components/compass_icon';
import ProgressiveImage from '@components/progressive_image';
import {useServerUrl} from '@context/server';
import {useGalleryItem} from '@hooks/gallery';
import {lookupMimeType} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {calculateDimensions, isGifTooLarge} from '@utils/images';
import {removeImageProxyForKey} from '@utils/markdown';
import {urlSafeBase64Encode} from '@utils/security';
import {secureGetFromRecord} from '@utils/types';
import {safeDecodeURIComponent} from '@utils/url';

import type {GalleryItemType} from '@typings/screens/gallery';

type MarkdownTableImageProps = {
    disabled?: boolean;
    imagesMetadata: Record<string, PostImage | undefined>;
    location?: string;
    postId: string;
    serverURL?: string;
    source: string;
    theme: Theme;
}

const style = StyleSheet.create({
    container: {
        alignItems: 'center',
        flex: 1,
    },
});

const MarkTableImage = ({
    disabled,
    imagesMetadata,
    location,
    postId,
    serverURL,
    source,
    theme,
}: MarkdownTableImageProps) => {
    const sourceKey = removeImageProxyForKey(source);
    const metadata = secureGetFromRecord(imagesMetadata, sourceKey);
    const fileId = useRef<string | null>(null);
    if (fileId.current === null) {
        fileId.current = `uid-${urlSafeBase64Encode(sourceKey)}`;
    }
    const [failed, setFailed] = useState(isGifTooLarge(metadata));
    const currentServerUrl = useServerUrl();
    const galleryIdentifier = `${postId}-${fileId.current}-${location}`;

    const getImageSource = useCallback(() => {
        let uri = source;
        let server = serverURL;

        if (!serverURL) {
            server = currentServerUrl;
        }

        if (uri.startsWith('/')) {
            uri = server + uri;
        }

        return uri;
    }, [source, serverURL, currentServerUrl]);

    const getFileInfo = useCallback((): FileInfo => {
        const height = metadata?.height || 0;
        const width = metadata?.width || 0;
        const uri = getImageSource();
        const decodedLink = safeDecodeURIComponent(uri);
        let filename = parseUrl(decodedLink.substring(decodedLink.lastIndexOf('/'))).pathname.replace('/', '');
        let extension = filename.split('.').pop() || '';

        if (extension === filename) {
            const ext = filename.indexOf('.') === -1 ? '.png' : filename.substring(filename.lastIndexOf('.'));
            filename = `${filename}${ext}`;
            extension = ext;
        }

        return {
            id: fileId.current || '',
            name: filename,
            extension,
            has_preview_image: true,
            post_id: postId,
            uri,
            width,
            height,
            mime_type: lookupMimeType(filename),
            size: 0,
            user_id: '',
        };
    }, [getImageSource, metadata?.height, metadata?.width, postId]);

    const handlePreviewImage = useCallback(() => {
        const file = getFileInfo();
        if (!file?.uri) {
            return;
        }
        const item: GalleryItemType = {
            ...fileToGalleryItem(file, undefined, undefined, 0, file.id),
            type: 'image',
        };
        openGalleryAtIndex(galleryIdentifier, 0, [item]);
    }, [getFileInfo, galleryIdentifier]);

    const {ref, onGestureEvent, styles} = useGalleryItem(
        galleryIdentifier,
        0,
        handlePreviewImage,
    );

    const onLoadFailed = useCallback(() => {
        setFailed(true);
    }, []);

    let image;
    if (failed) {
        image = (
            <CompassIcon
                name='file-image-broken-outline-large'
                size={24}
            />
        );
    } else {
        const {height, width} = calculateDimensions(metadata?.height, metadata?.width, 100, 100);
        image = (
            <TouchableWithoutFeedback
                disabled={disabled}
                onPress={onGestureEvent}
            >
                <Animated.View style={[styles, {width, height}]}>
                    <ProgressiveImage
                        id={fileId.current}
                        imageUri={source}
                        forwardRef={ref}
                        onError={onLoadFailed}
                        contentFit='contain'
                        style={{width, height}}
                        theme={theme}
                    />
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }

    return (
        <View
            style={style.container}
            testID='markdown_table_image'
        >
            {image}
        </View>
    );
};

export default memo(MarkTableImage);
