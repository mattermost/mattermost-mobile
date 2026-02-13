// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {
    ScrollView,
    Text,
    View,
    Platform,
} from 'react-native';
import Animated, {FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {GalleryInit} from '@context/gallery';
import {useTheme} from '@context/theme';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';
import {fileToGalleryItem, openGalleryAtIndex} from '@utils/gallery';
import {makeStyleSheetFromTheme} from '@utils/theme';

import UploadItem from './upload_item/upload_item_wrapper';

const CONTAINER_HEIGHT_MAX = 80;
const CONTAINER_HEIGHT_MIN = 0;
const ERROR_FADE_IN_OUT_DURATION = 150;

type Props = {
    currentUserId: string;
    files: FileInfo[];
    uploadFileError: React.ReactNode;
    channelId: string;
    rootId: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        previewContainer: {
            display: 'flex',
            flexDirection: 'column',
        },
        fileContainer: {
            display: 'flex',
            flexDirection: 'row',
            height: 0,
        },
        errorContainer: {
            marginTop: Platform.select({
                ios: 4,
                android: 2,
            }),
            marginBottom: 6,
            marginHorizontal: 12,
        },
        scrollView: {
            flex: 1,
        },
        scrollViewContent: {
            alignItems: 'flex-end',
            paddingRight: 12,
        },
        warning: {
            color: theme.errorTextColor,
            flex: 1,
            flexWrap: 'wrap',
        },
    };
});

function Uploads({
    currentUserId,
    files,
    uploadFileError,
    channelId,
    rootId,
}: Props) {
    const galleryIdentifier = `${channelId}-uploadedItems-${rootId}`;
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const containerHeight = useSharedValue(files.length ? CONTAINER_HEIGHT_MAX : CONTAINER_HEIGHT_MIN);
    const filesForGallery = useRef(files.filter((f) => !f.failed && !DraftEditPostUploadManager.isUploading(f.clientId!)));
    const hasFiles = files.length > 0;

    const containerAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(containerHeight.value),
        };
    });

    const fileContainerStyle = useMemo(() => ({
        paddingBottom: files.length ? 5 : 0,
    }), [files.length]);

    useEffect(() => {
        filesForGallery.current = files.filter((f) => !f.failed && !DraftEditPostUploadManager.isUploading(f.clientId!));
    }, [files]);

    useEffect(() => {
        if (hasFiles) {
            containerHeight.value = CONTAINER_HEIGHT_MAX;
            return;
        }
        containerHeight.value = CONTAINER_HEIGHT_MIN;
    }, [containerHeight, hasFiles]);

    const openGallery = useCallback((file: FileInfo) => {
        const items = filesForGallery.current.map((f) => fileToGalleryItem(f, currentUserId, undefined, 0, f.id || f.clientId));
        const index = filesForGallery.current.findIndex((f) => f.clientId === file.clientId);
        openGalleryAtIndex(galleryIdentifier, index, items, true);
    }, [currentUserId, galleryIdentifier]);

    const buildFilePreviews = () => {
        return files.map((file, index) => {
            return (
                <UploadItem
                    channelId={channelId}
                    galleryIdentifier={galleryIdentifier}
                    index={index}
                    file={file}
                    key={file.clientId || file.id}
                    openGallery={openGallery}
                    rootId={rootId}
                />
            );
        });
    };

    return (
        <GalleryInit galleryIdentifier={galleryIdentifier}>
            <View
                style={style.previewContainer}
                testID='uploads'
            >
                <Animated.View
                    style={[style.fileContainer, fileContainerStyle, containerAnimatedStyle]}
                >
                    <ScrollView
                        horizontal={true}
                        style={style.scrollView}
                        contentContainerStyle={style.scrollViewContent}
                        keyboardShouldPersistTaps={'handled'}
                    >
                        {buildFilePreviews()}
                    </ScrollView>
                </Animated.View>

                {Boolean(uploadFileError) &&
                <Animated.View
                    entering={FadeIn.duration(ERROR_FADE_IN_OUT_DURATION)}
                    exiting={FadeOut.duration(ERROR_FADE_IN_OUT_DURATION)}
                    style={style.errorContainer}
                >
                    <Text style={style.warning}>
                        {uploadFileError}
                    </Text>
                </Animated.View>
                }
            </View>
        </GalleryInit>
    );
}

export default React.memo(Uploads);
