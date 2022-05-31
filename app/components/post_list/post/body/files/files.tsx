// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Animated, {useDerivedValue} from 'react-native-reanimated';

import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import {Events} from '@constants';
import {GalleryInit} from '@context/gallery';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {isGif, isImage, isVideo} from '@utils/file';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {getViewPortWidth} from '@utils/images';
import {preventDoubleTap} from '@utils/tap';

import File from './file';

type FilesProps = {
    canDownloadFiles: boolean;
    failed?: boolean;
    filesInfo: FileInfo[];
    layoutWidth?: number;
    location: string;
    isReplyPost: boolean;
    postId: string;
    publicLinkEnabled: boolean;
    theme: Theme;
}

const MAX_VISIBLE_ROW_IMAGES = 4;
const styles = StyleSheet.create({
    row: {
        flex: 1,
        flexDirection: 'row',
        marginTop: 5,
    },
    container: {
        flex: 1,
    },
    gutter: {
        marginLeft: 8,
    },
    failed: {
        opacity: 0.5,
    },
});

const Files = ({canDownloadFiles, failed, filesInfo, isReplyPost, layoutWidth, location, postId, publicLinkEnabled, theme}: FilesProps) => {
    const galleryIdentifier = `${postId}-fileAttachments-${location}`;
    const [inViewPort, setInViewPort] = useState(false);
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();

    const {images: imageAttachments, nonImages: nonImageAttachments} = useMemo(() => {
        return filesInfo.reduce(({images, nonImages}: {images: FileInfo[]; nonImages: FileInfo[]}, file) => {
            const imageFile = isImage(file);
            const videoFile = isVideo(file);
            if (imageFile || (videoFile && publicLinkEnabled)) {
                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    uri = (isGif(file) || videoFile) ? buildFileUrl(serverUrl, file.id!) : buildFilePreviewUrl(serverUrl, file.id!);
                }
                images.push({...file, uri});
            } else {
                if (videoFile) {
                    // fallback if public links are not enabled
                    file.uri = buildFileUrl(serverUrl, file.id!);
                }

                nonImages.push(file);
            }
            return {images, nonImages};
        }, {images: [], nonImages: []});
    }, [filesInfo, publicLinkEnabled, serverUrl]);

    const filesForGallery = useDerivedValue(() => imageAttachments.concat(nonImageAttachments),
        [imageAttachments, nonImageAttachments]);

    const attachmentIndex = (fileId: string) => {
        return filesForGallery.value.findIndex((file) => file.id === fileId) || 0;
    };

    const handlePreviewPress = preventDoubleTap((idx: number) => {
        const items = filesForGallery.value.map((f) => fileToGalleryItem(f, f.user_id));
        openGalleryAtIndex(galleryIdentifier, idx, items);
    });

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';

        filesForGallery.value[idx] = file;
    };

    const isSingleImage = () => (filesInfo.length === 1 && (isImage(filesInfo[0]) || isVideo(filesInfo[0])));

    const renderItems = (items: FileInfo[], moreImagesCount = 0, includeGutter = false) => {
        const singleImage = isSingleImage();
        let nonVisibleImagesCount: number;
        let container: StyleProp<ViewStyle> = items.length > 1 ? styles.container : undefined;
        const containerWithGutter = [container, styles.gutter];

        return items.map((file, idx) => {
            if (moreImagesCount && idx === MAX_VISIBLE_ROW_IMAGES - 1) {
                nonVisibleImagesCount = moreImagesCount;
            }

            if (idx !== 0 && includeGutter) {
                container = containerWithGutter;
            }
            return (
                <View
                    style={container}
                    key={file.id}
                >
                    <File
                        galleryIdentifier={galleryIdentifier}
                        key={file.id}
                        canDownloadFiles={canDownloadFiles}
                        file={file}
                        index={attachmentIndex(file.id!)}
                        onPress={handlePreviewPress}
                        theme={theme}
                        isSingleImage={singleImage}
                        nonVisibleImagesCount={nonVisibleImagesCount}
                        publicLinkEnabled={publicLinkEnabled}
                        updateFileForGallery={updateFileForGallery}
                        wrapperWidth={layoutWidth || (getViewPortWidth(isReplyPost, isTablet) - 6)}
                        inViewPort={inViewPort}
                    />
                </View>
            );
        });
    };

    const renderImageRow = () => {
        if (imageAttachments.length === 0) {
            return null;
        }

        const visibleImages = imageAttachments.slice(0, MAX_VISIBLE_ROW_IMAGES);
        const portraitPostWidth = layoutWidth || (getViewPortWidth(isReplyPost, isTablet) - 6);

        let nonVisibleImagesCount;
        if (imageAttachments.length > MAX_VISIBLE_ROW_IMAGES) {
            nonVisibleImagesCount = imageAttachments.length - MAX_VISIBLE_ROW_IMAGES;
        }

        return (
            <View style={[styles.row, {width: portraitPostWidth}]}>
                { renderItems(visibleImages, nonVisibleImagesCount, true) }
            </View>
        );
    };

    useEffect(() => {
        const onScrollEnd = DeviceEventEmitter.addListener(Events.ITEM_IN_VIEWPORT, (viewableItems) => {
            if (`${location}-${postId}` in viewableItems) {
                setInViewPort(true);
            }
        });

        return () => onScrollEnd.remove();
    }, []);

    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <Animated.View style={[failed && styles.failed]}>
                {renderImageRow()}
                {renderItems(nonImageAttachments)}
            </Animated.View>
        </GalleryInit>
    );
};

export default React.memo(Files);
