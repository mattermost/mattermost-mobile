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

import {useTheme} from '@app/context/theme';
import {openGalleryAtIndex} from '@utils/gallery';
import {makeStyleSheetFromTheme} from '@utils/theme';

import UploadItem from './upload_item';

type Props = {
    files: FileInfo[];
    uploadFileError: React.ReactNode;
    removeFile: (file: FileInfo) => void;
    retryFileUpload: (file: FileInfo) => void;
}

export default function Uploads({
    files,
    uploadFileError,
    removeFile,
    retryFileUpload,
}: Props) {
    const theme = useTheme();

    const errorHeight = useSharedValue(0);
    const containerHeight = useSharedValue(150);

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

    useEffect(() => {
        if (uploadFileError) {
            errorHeight.value = 20;
        } else {
            errorHeight.value = 0;
        }
    }, [uploadFileError]);

    useEffect(() => {
        if (files.length) {
            containerHeight.value = 67;
            return;
        }
        containerHeight.value = 0;
    }, [files.length > 0]);

    const openGallery = useCallback((file: FileInfo) => {
        const index = files.indexOf(file);
        openGalleryAtIndex(index, files.filter((f) => !f.failed && !f.loading));
    }, [files]);

    const buildFilePreviews = () => {
        return files.map((file) => {
            return (
                <UploadItem
                    key={file.clientId}
                    file={file}
                    openGallery={openGallery}
                    removeFile={removeFile}
                    retryFileUpload={retryFileUpload}
                />
            );
        });
    };

    const style = getStyleSheet(theme);
    const fileContainerStyle = {
        paddingBottom: files.length ? 5 : 0,
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
                <View style={style.errorTextContainer}>
                    {Boolean(uploadFileError) &&
                        <Text style={style.warning}>
                            {uploadFileError}
                        </Text>
                    }
                </View>
            </Animated.View>
        </View>
    );
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
