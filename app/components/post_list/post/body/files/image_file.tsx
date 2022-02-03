// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle} from 'react-native';

import ProgressiveImage from '@components/progressive_image';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {calculateDimensions} from '@utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import FileIcon from './file_icon';

import type {Client} from '@client/rest';
import type {ResizeMode} from 'react-native-fast-image';

type ImageFileProps = {
    backgroundColor?: string;
    file: FileInfo;
    inViewPort?: boolean;
    isSingleImage?: boolean;
    resizeMode?: ResizeMode;
    wrapperWidth?: number;
}

type ProgressiveImageProps = {
    defaultSource?: {uri: string};
    imageUri?: string;
    inViewPort?: boolean;
    thumbnailUri?: string;
}

const SMALL_IMAGE_MAX_HEIGHT = 48;
const SMALL_IMAGE_MAX_WIDTH = 48;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    imagePreview: {
        ...StyleSheet.absoluteFillObject,
    },
    fileImageWrapper: {
        borderRadius: 5,
        overflow: 'hidden',
    },
    boxPlaceholder: {
        paddingBottom: '100%',
    },
    failed: {
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        borderWidth: 1,
    },
    smallImageBorder: {
        borderRadius: 5,
    },
    smallImageOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    singleSmallImageWrapper: {
        height: SMALL_IMAGE_MAX_HEIGHT,
        width: SMALL_IMAGE_MAX_WIDTH,
        overflow: 'hidden',
    },
}));

const ImageFile = ({
    backgroundColor, file, inViewPort, isSingleImage,
    resizeMode = 'cover', wrapperWidth,
}: ImageFileProps) => {
    const serverUrl = useServerUrl();
    const [failed, setFailed] = useState(false);
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    let image;
    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing
    }

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
            props.defaultSource = {uri: file.localPath};
        } else if (file.id) {
            if (file.mini_preview && file.mime_type) {
                props.thumbnailUri = `data:${file.mime_type};base64,${file.mini_preview}`;
            } else {
                props.thumbnailUri = client?.getFileThumbnailUrl(file.id, 0);
            }
            props.imageUri = client?.getFilePreviewUrl(file.id, 0);
            props.inViewPort = inViewPort;
        }
        return props;
    };

    if (file.height <= SMALL_IMAGE_MAX_HEIGHT || file.width <= SMALL_IMAGE_MAX_WIDTH) {
        let wrapperStyle: StyleProp<ViewStyle> = style.fileImageWrapper;
        if (isSingleImage) {
            wrapperStyle = style.singleSmallImageWrapper;

            if (file.width > SMALL_IMAGE_MAX_WIDTH) {
                wrapperStyle = [wrapperStyle, {width: '100%'}];
            }
        }

        image = (
            <ProgressiveImage
                id={file.id!}
                style={{height: file.height, width: file.width}}
                tintDefaultSource={!file.localPath && !failed}
                onError={handleError}
                resizeMode={'contain'}
                {...imageProps()}
            />
        );

        if (failed) {
            image = (
                <FileIcon
                    failed={failed}
                    file={file}
                    backgroundColor={backgroundColor}
                />
            );
        }

        return (
            <View
                style={[
                    wrapperStyle,
                    style.smallImageBorder,
                    {
                        borderColor: changeOpacity(theme.centerChannelColor, 0.4),
                        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                    },
                ]}
            >
                {!isSingleImage && <View style={style.boxPlaceholder}/>}
                <View style={style.smallImageOverlay}>
                    {image}
                </View>
            </View>
        );
    }

    const imageDimensions = getImageDimensions();
    image = (
        <ProgressiveImage
            id={file.id!}
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

    return (
        <View
            style={style.fileImageWrapper}
        >
            {!isSingleImage && <View style={style.boxPlaceholder}/>}
            {image}
        </View>
    );
};

export default ImageFile;
