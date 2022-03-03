// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {View} from 'react-native';
import {TapGestureHandler} from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useGalleryItem} from '@hooks/gallery';
import {isDocument, isImage, isVideo} from '@utils/file';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import DocumentFile, {DocumentFileRef} from './document_file';
import FileIcon from './file_icon';
import FileInfo from './file_info';
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
    theme: Theme;
    wrapperWidth?: number;
    updateFileForGallery: (idx: number, file: FileInfo) => void;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        fileWrapper: {
            flex: 1,
            flexDirection: 'row',
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
    canDownloadFiles, file, galleryIdentifier, index, inViewPort = false, isSingleImage = false,
    nonVisibleImagesCount = 0, onPress, publicLinkEnabled, theme, wrapperWidth = 300, updateFileForGallery,
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

    const {styles, onGestureEvent, ref} = useGalleryItem(galleryIdentifier, index, handlePreviewPress);

    if (isVideo(file) && publicLinkEnabled) {
        return (
            <TapGestureHandler
                onGestureEvent={onGestureEvent}
                shouldCancelWhenOutside={true}
            >
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
            </TapGestureHandler>
        );
    }

    if (isImage(file)) {
        return (
            <TapGestureHandler
                onGestureEvent={onGestureEvent}
                shouldCancelWhenOutside={true}
            >
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
            </TapGestureHandler>
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
                    onPress={handlePreviewPress}
                    theme={theme}
                />
            </View>
        );
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
            <FileInfo
                file={file}
                onPress={handlePreviewPress}
                theme={theme}
            />
        </View>
    );
};

export default File;
