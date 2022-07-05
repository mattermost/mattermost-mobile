// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef, useMemo} from 'react';
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
    asCard?: boolean;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 10,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.24),
            borderRadius: 4,
        },
        iconWrapper: {
            marginTop: 7.8,
            marginRight: 7,
            marginBottom: 8.2,
            marginLeft: 6,
        },
        imageVideo: {
            height: 40,
            width: 40,
            margin: 4,
        },
    };
});

const File = ({
    asCard = false, canDownloadFiles, channelName, file, galleryIdentifier, showDate = false, index, inViewPort = false, isSingleImage = false,
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
        onOptionsPress?.(index);
    }, [index, onOptionsPress]);

    const renderOptionsButton = () => {
        if (onOptionsPress) {
            return (
                <FileOptionsIcon
                    onPress={handleOnOptionsPress}
                />
            );
        }
        return null;
    };

    const fileInfo = useMemo(() => {
        return (
            <FileInfo
                file={file}
                showDate={showDate}
                channelName={channelName}
                onPress={handlePreviewPress}
                theme={theme}
            />
        );
    }, [file, showDate, channelName, handlePreviewPress, theme]);

    const {styles, onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index, handlePreviewPress);

    const renderImageFileOverlay = useCallback(() => {
        if (nonVisibleImagesCount) {
            return (
                <ImageFileOverlay
                    theme={theme}
                    value={nonVisibleImagesCount}
                />
            );
        }
        return null;
    }, [theme, nonVisibleImagesCount]);

    const imageFile = useMemo(() => {
        return (
            <TouchableWithoutFeedback onPress={onGestureEvent}>
                <Animated.View style={[styles, asCard ? style.imageVideo : null]}>
                    <ImageFile
                        file={file}
                        forwardRef={ref}
                        inViewPort={inViewPort}
                        isSingleImage={isSingleImage}
                        resizeMode={'cover'}
                        wrapperWidth={wrapperWidth}
                    />
                    {renderImageFileOverlay()}
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }, [file, ref, inViewPort, isSingleImage, wrapperWidth, styles, onGestureEvent, renderImageFileOverlay]);

    const videoFile = useMemo(() => {
        return (
            <TouchableWithoutFeedback onPress={onGestureEvent}>
                <Animated.View style={[styles, asCard ? style.imageVideo : null]}>
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
                    {renderImageFileOverlay()}
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }, [file, ref, inViewPort, isSingleImage, wrapperWidth, styles, updateFileForGallery, index, onGestureEvent]);

    const documentFile = useMemo(() => {
        return (
            <View style={style.iconWrapper}>
                <DocumentFile
                    ref={document}
                    canDownloadFiles={canDownloadFiles}
                    file={file}
                    theme={theme}
                />
            </View>
        );
    }, [document, file, canDownloadFiles, theme]);

    if (isVideo(file) && publicLinkEnabled) {
        if (asCard) {
            return (
                <View style={[style.fileWrapper]}>
                    <View style={style.iconWrapper}>
                        {videoFile}
                    </View>
                    {fileInfo}
                    {renderOptionsButton()}
                </View>
            );
        }
        return (videoFile);
    }

    if (isImage(file)) {
        if (asCard) {
            return (
                <View style={[style.fileWrapper]}>
                    <View style={style.iconWrapper}>
                        {imageFile}
                    </View>
                    {fileInfo}
                    {renderOptionsButton()}
                </View>
            );
        }
        return (imageFile);
    }

    if (isDocument(file)) {
        <View style={[style.fileWrapper]}>
            {documentFile}
            {fileInfo}
            {renderOptionsButton()}
        </View>;
    }

    return (
        <View style={[style.fileWrapper]}>
            <View style={style.iconWrapper}>
                <TouchableWithFeedback
                    onPress={handlePreviewPress}
                    type={'opacity'}
                >
                    <FileIcon
                        file={file}
                    />
                </TouchableWithFeedback>
            </View>
            {fileInfo}
            {renderOptionsButton()}
        </View>
    );
};

export default File;
