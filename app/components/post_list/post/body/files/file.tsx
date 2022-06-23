// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {View, TouchableWithoutFeedback} from 'react-native';
import Animated from 'react-native-reanimated';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useGalleryItem} from '@hooks/gallery';
import {isDocument, isImage, isVideo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DocumentFile, {DocumentFileRef} from './document_file';
import FileIcon from './file_icon';
import FileInfo from './file_info';
import FileOptionsIcon from './file_options_icon';
import ImageFile from './image_file';
import ImageFileOverlay from './image_file_overlay';
import VideoFile from './video_file';

type FileProps = {
    canDownloadFiles: boolean;
    file: FileInfo;
    galleryIdentifier: string;
    index: number;
    inViewPort: boolean;
    isSingleImage: boolean;
    nonVisibleImagesCount: number;
    onPress: (index: number) => void;
    publicLinkEnabled: boolean;
    channelName?: string;
    onOptionsPress?: (index: number) => void;
    theme: Theme;
    wrapperWidth?: number;
    showDate?: boolean;
    updateFileForGallery: (idx: number, file: FileInfo) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 10,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.4),
            borderRadius: 5,
        },
        iconWrapper: {
            marginTop: 7.8,
            marginRight: 6,
            marginBottom: 8.2,
            marginLeft: 8,
        },
    };
});

const File = ({
    canDownloadFiles, channelName, file, galleryIdentifier, showDate = false, index, inViewPort = false, isSingleImage = false,
    nonVisibleImagesCount = 0, onPress, onOptionsPress, publicLinkEnabled, theme, wrapperWidth = 300, updateFileForGallery,
}: FileProps) => {
    const document = useRef<DocumentFileRef>(null);
    const style = getStyleSheet(theme);

    const handlePreviewPress = useCallback(() => {
        if (document.current) {
            document.current.handlePreviewPress();
        } else {
            onPress(index);
        }
    }, [index]);

    const handleOnOptionsPress = useCallback(() => {
        if (!onOptionsPress) {
            return;
        }
        onOptionsPress(index);
    }, [index]);

    const {styles, onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index, handlePreviewPress);

    if (isVideo(file) && publicLinkEnabled) {
        return (
            <TouchableWithoutFeedback onPress={onGestureEvent}>
                <Animated.View style={[styles]}>
                    <VideoFile
                        file={file}
                        forwardRef={ref}
                        inViewPort={inViewPort}
                        isSingleImage={isSingleImage}
                        resizeMode={'cover'}
                        wrapperWidth={wrapperWidth}
                        updateFileForGallery={updateFileForGallery}
                        index={index}
                    />
                    {Boolean(nonVisibleImagesCount) &&
                    <ImageFileOverlay
                        theme={theme}
                        value={nonVisibleImagesCount}
                    />
                    }
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }

    if (isImage(file)) {
        return (
            <TouchableWithoutFeedback onPress={onGestureEvent}>
                <Animated.View style={[styles]}>
                    <ImageFile
                        file={file}
                        forwardRef={ref}
                        inViewPort={inViewPort}
                        isSingleImage={isSingleImage}
                        resizeMode={'cover'}
                        wrapperWidth={wrapperWidth}
                    />
                    {Boolean(nonVisibleImagesCount) &&
                    <ImageFileOverlay
                        theme={theme}
                        value={nonVisibleImagesCount}
                    />
                    }
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }

    if (isDocument(file)) {
        return (
            <View style={[style.fileWrapper]}>
                <View style={style.iconWrapper}>
                    <DocumentFile
                        ref={document}
                        canDownloadFiles={canDownloadFiles}
                        file={file}
                        theme={theme}
                    />
                </View>
                <FileInfo
                    file={file}
                    showDate={showDate}
                    channelName={channelName}
                    onPress={handlePreviewPress}
                    theme={theme}
                />
                {onOptionsPress &&
                    <FileOptionsIcon
                        onPress={handleOnOptionsPress}
                    />
                }
            </View>
        );
    }

    return (
        <TouchableWithFeedback
            onPress={handlePreviewPress}
            type={'opacity'}
            style={style.fileWrapper}
        >
            <View style={style.iconWrapper}>
                <FileIcon
                    file={file}
                />
            </View>
            <FileInfo
                file={file}
                showDate={showDate}
                channelName={channelName}
                onPress={handlePreviewPress}
                theme={theme}
            />
            {onOptionsPress &&
                <FileOptionsIcon
                    onPress={handleOnOptionsPress}
                />
            }
        </TouchableWithFeedback>
    );
};

export default File;
