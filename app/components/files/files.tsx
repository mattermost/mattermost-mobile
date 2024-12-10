// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native';
import Animated, {useDerivedValue} from 'react-native-reanimated';

import {Events} from '@constants';
import {GalleryInit} from '@context/gallery';
import {useIsTablet} from '@hooks/device';
import {useImageAttachments} from '@hooks/files';
import {isImage, isVideo} from '@utils/file';
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
    postProps: Record<string, unknown>;
    publicLinkEnabled: boolean;
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
    marginTop: {
        marginTop: 10,
    },
});

const Files = ({canDownloadFiles, failed, filesInfo, isReplyPost, layoutWidth, location, postId, postProps, publicLinkEnabled}: FilesProps) => {
    const galleryIdentifier = `${postId}-fileAttachments-${location}`;
    const [inViewPort, setInViewPort] = useState(false);
    const isTablet = useIsTablet();

    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(filesInfo, publicLinkEnabled);

    const filesForGallery = useDerivedValue(() => imageAttachments.concat(nonImageAttachments),
        [imageAttachments, nonImageAttachments]);

    const attachmentIndex = (fileId: string) => {
        return filesForGallery.value.findIndex((file) => file.id === fileId) || 0;
    };

    const handlePreviewPress = preventDoubleTap((idx: number) => {
        const items = filesForGallery.value.map((f) => fileToGalleryItem(f, f.user_id, postProps));
        openGalleryAtIndex(galleryIdentifier, idx, items);
    });

    const updateFileForGallery = (idx: number, file: FileInfo) => {
        'worklet';
        filesForGallery.value[idx] = file;
    };

    const isSingleImage = useMemo(() => filesInfo.filter((f) => isImage(f) || isVideo(f)).length === 1, [filesInfo]);

    const renderItems = (items: FileInfo[], moreImagesCount = 0, includeGutter = false) => {
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
                    style={[container, styles.marginTop]}
                    key={file.id}
                >
                    <File
                        galleryIdentifier={galleryIdentifier}
                        key={file.id}
                        canDownloadFiles={canDownloadFiles}
                        file={file}
                        index={attachmentIndex(file.id!)}
                        onPress={handlePreviewPress}
                        isSingleImage={isSingleImage}
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
