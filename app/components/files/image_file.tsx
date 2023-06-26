// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {buildFilePreviewUrl, buildFileThumbnailUrl} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import ProgressiveImage from '@components/progressive_image';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {isGif as isGifImage} from '@utils/file';
import {calculateDimensions} from '@utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import FileIcon from './file_icon';

import type {ResizeMode} from 'react-native-fast-image';

type ImageFileProps = {
    backgroundColor?: string;
    file: FileInfo;
    forwardRef?: React.RefObject<unknown>;
    inViewPort?: boolean;
    isSingleImage?: boolean;
    resizeMode?: ResizeMode;
    wrapperWidth?: number;
}

const SMALL_IMAGE_MAX_HEIGHT = 48;
const SMALL_IMAGE_MAX_WIDTH = 48;
const GRADIENT_COLORS = ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, .32)'];
const GRADIENT_END = {x: 1, y: 1};
const GRADIENT_LOCATIONS = [0.5, 1];
const GRADIENT_START = {x: 0.5, y: 0.5};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    boxPlaceholder: {
        paddingBottom: '100%',
    },
    fileImageWrapper: {
        borderRadius: 5,
        overflow: 'hidden',
    },
    failed: {
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        borderWidth: 1,
    },
    gifContainer: {
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        padding: 8,
        ...StyleSheet.absoluteFillObject,
    },
    imagePreview: {
        ...StyleSheet.absoluteFillObject,
    },
    singleSmallImageWrapper: {
        height: SMALL_IMAGE_MAX_HEIGHT,
        width: SMALL_IMAGE_MAX_WIDTH,
    },
}));

const ImageFile = ({
    backgroundColor, file, forwardRef, inViewPort, isSingleImage,
    resizeMode = 'cover', wrapperWidth,
}: ImageFileProps) => {
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const isGif = useMemo(() => isGifImage(file), [file]);
    const [failed, setFailed] = useState(false);
    const style = getStyleSheet(theme);
    let image;

    const getImageDimensions = () => {
        if (isSingleImage) {
            const viewPortHeight = Math.max(dimensions.height, dimensions.width) * 0.45;
            return calculateDimensions(file?.height, file?.width, wrapperWidth, viewPortHeight);
        }

        return undefined;
    };

    const handleError = useCallback(() => {
        setFailed(true);
    }, []);

    const imageProps = () => {
        const props: ProgressiveImageProps = {};

        if (file.localPath) {
            const prefix = file.localPath.startsWith('file://') ? '' : 'file://';
            props.defaultSource = {uri: prefix + file.localPath};
        } else if (file.id) {
            if (file.mini_preview && file.mime_type) {
                props.thumbnailUri = `data:${file.mime_type};base64,${file.mini_preview}`;
            } else {
                props.thumbnailUri = buildFileThumbnailUrl(serverUrl, file.id);
            }
            props.imageUri = buildFilePreviewUrl(serverUrl, file.id);
            props.inViewPort = inViewPort;
        }
        return props;
    };

    let imageDimensions = getImageDimensions();
    if (isSingleImage && (!imageDimensions || (imageDimensions?.height === 0 && imageDimensions?.width === 0))) {
        imageDimensions = style.singleSmallImageWrapper;
    }

    image = (
        <ProgressiveImage
            id={file.id!}
            forwardRef={forwardRef}
            style={[isSingleImage ? null : style.imagePreview, imageDimensions]}
            tintDefaultSource={!file.localPath && !failed}
            onError={handleError}
            resizeMode={resizeMode}
            {...imageProps()}
        />
    );

    if (failed) {
        image = (
            <View style={[isSingleImage ? null : style.imagePreview, style.failed, imageDimensions]}>
                <FileIcon
                    failed={failed}
                    file={file}
                    backgroundColor={backgroundColor}
                />
            </View>
        );
    }

    let gifIndicator;
    if (isGif) {
        gifIndicator = (
            <View style={StyleSheet.absoluteFill}>
                <LinearGradient
                    start={GRADIENT_START}
                    end={GRADIENT_END}
                    locations={GRADIENT_LOCATIONS}
                    colors={GRADIENT_COLORS}
                    style={[style.imagePreview, {...imageDimensions}]}
                />
                <View style={[style.gifContainer, {...imageDimensions}]}>
                    <CompassIcon
                        name='file-gif'
                        color='#FFF'
                        size={24}
                    />
                </View>
            </View>
        );
    }

    return (
        <View
            style={style.fileImageWrapper}
        >
            {!isSingleImage && <View style={style.boxPlaceholder}/>}
            {image}
            {gifIndicator}
        </View>
    );
};

export default ImageFile;
