// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {
    ScrollView,
    Text,
    View,
    Platform,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import DraftUploadManager from '@init/draft_upload_manager';
import {openGalleryAtIndex} from '@utils/gallery';
import {makeStyleSheetFromTheme} from '@utils/theme';

import UploadItem from './upload_item';

const CONTAINER_HEIGHT_MAX = 67;
const CONATINER_HEIGHT_MIN = 0;
const ERROR_HEIGHT_MAX = 20;
const ERROR_HEIGHT_MIN = 0;

type Props = {
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
            height: 0,
        },
        errorTextContainer: {
            marginTop: Platform.select({
                ios: 4,
                android: 2,
            }),
            marginHorizontal: 12,
            flex: 1,
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

export default function Uploads({
    files,
    uploadFileError,
    channelId,
    rootId,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const errorHeight = useSharedValue(ERROR_HEIGHT_MIN);
    const containerHeight = useSharedValue(CONTAINER_HEIGHT_MAX);

    const errorAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(errorHeight.value),
        };
    });

    const containerAnimatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(containerHeight.value),
        };
    });

    const fileContainerStyle = {
        paddingBottom: files.length ? 5 : 0,
    };

    useEffect(() => {
        if (uploadFileError) {
            errorHeight.value = ERROR_HEIGHT_MAX;
        } else {
            errorHeight.value = ERROR_HEIGHT_MIN;
        }
    }, [uploadFileError]);

    useEffect(() => {
        if (files.length) {
            containerHeight.value = CONTAINER_HEIGHT_MAX;
            return;
        }
        containerHeight.value = CONATINER_HEIGHT_MIN;
    }, [files.length > 0]);

    const openGallery = useCallback((file: FileInfo) => {
        const galleryFiles = files.filter((f) => !f.failed && !DraftUploadManager.isUploading(f.clientId!));
        const index = galleryFiles.indexOf(file);
        openGalleryAtIndex(index, galleryFiles);
    }, [files]);

    const buildFilePreviews = () => {
        return files.map((file) => {
            return (
                <UploadItem
                    key={file.clientId}
                    file={file}
                    openGallery={openGallery}
                    channelId={channelId}
                    rootId={rootId}
                />
            );
        });
    };

    return (
        <View style={style.previewContainer}>
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

            <Animated.View
                style={[style.errorContainer, errorAnimatedStyle]}
            >
                {Boolean(uploadFileError) &&
                <View style={style.errorTextContainer}>

                    <Text style={style.warning}>
                        {uploadFileError}
                    </Text>

                </View>
                }
            </Animated.View>
        </View>
    );
}
