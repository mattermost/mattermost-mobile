// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import {Client4} from '@client/rest';
import {usePermanentSidebar, useSplitView} from '@hooks/permanent_sidebar';
import {FileInfo} from '@mm-redux/types/files';
import {Theme} from '@mm-redux/types/preferences';
import {isGif, isImage} from '@utils/file';
import {openGalleryAtIndex} from '@utils/gallery';
import {getViewPortWidth} from '@utils/images';
import {preventDoubleTap} from '@utils/tap';

import File from './file';

type FilesProps = {
    canDownloadFiles: boolean;
    failed?: boolean;
    files: FileInfo[];
    isReplyPost: boolean;
    postId: string;
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

const Files = ({canDownloadFiles, failed, files, isReplyPost, postId, theme}: FilesProps) => {
    const [inViewPort, setInViewPort] = useState(false);
    const permanentSidebar = usePermanentSidebar();
    const isSplitView = useSplitView();
    const imageAttachments = useRef<FileInfo[]>([]).current;
    const nonImageAttachments = useRef<FileInfo[]>([]).current;

    if (!imageAttachments.length && !nonImageAttachments.length) {
        files.reduce((info, file) => {
            if (isImage(file)) {
                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    uri = isGif(file) ? Client4.getFileUrl(file.id, 0) : Client4.getFilePreviewUrl(file.id, 0);
                }
                info.imageAttachments.push({...file, uri});
            } else {
                info.nonImageAttachments.push(file);
            }
            return info;
        }, {imageAttachments, nonImageAttachments});
    }

    const filesForGallery = useRef<FileInfo[]>(imageAttachments.concat(nonImageAttachments)).current;
    const attachmentIndex = (fileId: string) => {
        return filesForGallery.findIndex((file) => file.id === fileId) || 0;
    };

    const handlePreviewPress = preventDoubleTap((idx: number) => {
        openGalleryAtIndex(idx, filesForGallery);
    });

    const isSingleImage = () => (files.length === 1 && isImage(files[0]));

    const renderItems = (items: FileInfo[], moreImagesCount = 0, includeGutter = false) => {
        const singleImage = isSingleImage();
        let nonVisibleImagesCount: number;
        let container: StyleProp<ViewStyle> = styles.container;
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
                        key={file.id}
                        canDownloadFiles={canDownloadFiles}
                        file={file}
                        index={attachmentIndex(file.id)}
                        onPress={handlePreviewPress}
                        theme={theme}
                        isSingleImage={singleImage}
                        nonVisibleImagesCount={nonVisibleImagesCount}
                        wrapperWidth={getViewPortWidth(isReplyPost, (!isSplitView && permanentSidebar))}
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
        const hasFixedSidebar = !isSplitView && permanentSidebar;
        const portraitPostWidth = getViewPortWidth(isReplyPost, hasFixedSidebar);

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
        const onScrollEnd = DeviceEventEmitter.addListener('scrolled', (viewableItems) => {
            if (postId in viewableItems) {
                setInViewPort(true);
            }
        });

        return () => onScrollEnd.remove();
    }, []);

    return (
        <View style={[failed && styles.failed]}>
            {renderImageRow()}
            {renderItems(nonImageAttachments)}
        </View>
    );
};

export default Files;
