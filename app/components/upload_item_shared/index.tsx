// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {useMemo} from 'react';
import {TouchableWithoutFeedback, View, Text, type ViewStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import FileIcon from '@components/files/file_icon';
import ImageFile from '@components/files/image_file';
import UploadRetry from '@components/post_draft/uploads/upload_item/upload_retry';
import ProgressBar from '@components/progress_bar';
import {useTheme} from '@context/theme';
import {isImage, getFormattedFileSize} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

export const UPLOAD_ITEM_DIMENSIONS = {
    THUMBNAIL_SIZE: 64,
    ICON_SIZE: 48,
    FILE_CONTAINER_WIDTH: 264,
    FILE_CONTAINER_HEIGHT: 64,
} as const;

export interface UploadItemFile {
    id?: string;
    clientId?: string;
    name?: string;
    extension?: string;
    size?: number;
    uri?: string;
    failed?: boolean;
    width?: number;
    height?: number;
    mime_type?: string;
}

export interface UploadItemProps {
    file: UploadItemFile;
    onPress?: () => void;
    onRetry?: () => void;
    loading?: boolean;
    progress?: number;
    showRetryButton?: boolean;
    galleryStyles?: Animated.AnimateStyle<ViewStyle>;
    testID?: string;
    fullWidth?: boolean;
    isShareExtension?: boolean;
    forwardRef?: React.RefObject<unknown>;
    inViewPort?: boolean;
    hasError?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        previewContainer: {
            borderRadius: 4,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            backgroundColor: theme.centerChannelBg,
            alignItems: 'center',
            position: 'relative',
        },
        imageOnlyContainer: {
            width: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
            height: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
            padding: 0,
        },
        fileWithInfoContainer: {
            width: UPLOAD_ITEM_DIMENSIONS.FILE_CONTAINER_WIDTH,
            height: UPLOAD_ITEM_DIMENSIONS.FILE_CONTAINER_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 0,
            gap: 8,
            paddingVertical: 12,
            paddingLeft: 8,
            paddingRight: 16,
        },
        fullWidthContainer: {
            width: '100%',
            height: UPLOAD_ITEM_DIMENSIONS.FILE_CONTAINER_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            flexShrink: 0,
            gap: 8,
            paddingVertical: 12,
            paddingLeft: 20,
            paddingRight: 20,
        },
        iconContainer: {
            width: UPLOAD_ITEM_DIMENSIONS.ICON_SIZE,
            height: UPLOAD_ITEM_DIMENSIONS.ICON_SIZE,
            borderRadius: 4,
            justifyContent: 'center',
            alignItems: 'center',
        },
        imageContainer: {
            width: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
            height: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
            borderRadius: 4,
            marginRight: 8,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.16),
            shadowColor: '#000000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 1,
        },
        imageOnlyThumbnail: {
            width: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
            height: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
            borderRadius: 4,
            overflow: 'hidden',
            shadowColor: '#000000',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 1,
        },
        fileInfo: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'flex-start',
            minWidth: 0,
        },
        fileName: {
            color: theme.centerChannelColor,
            ...typography('Body', 200, 'SemiBold'),
            marginBottom: 2,
            width: '100%',
        },
        fileSize: {
            color: changeOpacity(theme.centerChannelColor, 0.64),
            ...typography('Body', 75, 'Regular'),
            width: '100%',
        },
        progress: {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.1)',
            borderRadius: 4,
            justifyContent: 'flex-end',
        },
        progressContainer: {
            paddingVertical: undefined,
            position: undefined,
            justifyContent: undefined,
        },
        errorBorder: {
            borderColor: theme.errorTextColor,
            borderWidth: 2,
        },
    };
});

export default function UploadItemShared({
    file,
    onPress,
    onRetry,
    loading = false,
    progress = 0,
    showRetryButton = false,
    galleryStyles,
    testID,
    fullWidth = false,
    isShareExtension = false,
    forwardRef,
    inViewPort = false,
    hasError = false,
}: UploadItemProps) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const fileForCheck = {
        name: file.name,
        extension: file.extension,
        mime_type: file.mime_type,
    } as FileInfo;

    const isImageFile = isImage(fileForCheck);

    const fileDisplayComponent = () => {
        if (isImageFile) {
            if (isShareExtension) {
                return (
                    <View style={style.imageOnlyThumbnail}>
                        <Image
                            source={{uri: file.uri}}
                            style={{
                                width: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
                                height: UPLOAD_ITEM_DIMENSIONS.THUMBNAIL_SIZE,
                                borderRadius: 4,
                            }}
                            contentFit='cover'
                        />
                    </View>
                );
            }

            const imageFileData = {
                ...fileForCheck,
                id: file.id,
                clientId: file.clientId,
                size: file.size,
                uri: file.uri,
                localPath: file.uri,
                width: file.width,
                height: file.height,
                failed: file.failed,
            } as FileInfo;

            return (
                <View style={style.imageOnlyThumbnail}>
                    <ImageFile
                        file={imageFileData}
                        forwardRef={forwardRef}
                        inViewPort={inViewPort}
                        contentFit='cover'
                    />
                </View>
            );
        }
        return (
            <View style={style.iconContainer}>
                <FileIcon
                    iconSize={48}
                    file={fileForCheck}
                />
            </View>
        );
    };

    const fileExtension = file.extension?.toUpperCase() || file.name?.split('.').pop()?.toUpperCase() || '';
    const formattedSize = getFormattedFileSize(file.size || 0);

    const containerStyle = useMemo(() => {
        let containerStyleType;
        if (fullWidth && !isImageFile) {
            containerStyleType = style.fullWidthContainer;
        } else if (isImageFile) {
            containerStyleType = style.imageOnlyContainer;
        } else {
            containerStyleType = style.fileWithInfoContainer;
        }

        const baseStyles = [style.previewContainer, containerStyleType];

        if (hasError) {
            return [
                ...baseStyles,
                style.errorBorder,
            ];
        }

        return baseStyles;
    }, [fullWidth, isImageFile, hasError, style.fileWithInfoContainer, style.imageOnlyContainer, style.fullWidthContainer, style.previewContainer, style.errorBorder]);

    return (
        <View
            style={containerStyle}
            testID={testID}
        >
            <TouchableWithoutFeedback onPress={onPress}>
                <Animated.View style={galleryStyles}>
                    {fileDisplayComponent()}
                </Animated.View>
            </TouchableWithoutFeedback>

            {!isImageFile && (
                <View style={style.fileInfo}>
                    <Text
                        style={style.fileName}
                        numberOfLines={1}
                        ellipsizeMode='tail'
                    >
                        {file.name || 'Unknown file'}
                    </Text>
                    <Text style={style.fileSize}>
                        {fileExtension && `${fileExtension} `}{formattedSize}
                    </Text>
                </View>
            )}

            {file.failed && showRetryButton && onRetry && (
                <UploadRetry
                    onPress={onRetry}
                />
            )}

            {loading && !file.failed && (
                <View style={style.progress}>
                    <ProgressBar
                        progress={progress || 0}
                        color={theme.buttonBg}
                        containerStyle={style.progressContainer}
                    />
                </View>
            )}
        </View>
    );
}
