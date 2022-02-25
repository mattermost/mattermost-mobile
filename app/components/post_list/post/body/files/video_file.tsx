// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getThumbnailAsync} from 'expo-video-thumbnails';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';

import {updateLocalFile} from '@actions/local/file';
import CompassIcon from '@components/compass_icon';
import ProgressiveImage from '@components/progressive_image';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {fileExists} from '@utils/file';
import {calculateDimensions} from '@utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import FileIcon from './file_icon';

import type {Client} from '@client/rest';
import type {ResizeMode} from 'react-native-fast-image';

type Props = {
    index: number;
    file: FileInfo;
    forwardRef: React.RefObject<unknown>;
    inViewPort?: boolean;
    isSingleImage?: boolean;
    resizeMode?: ResizeMode;
    wrapperWidth?: number;
    updateFileForGallery: (idx: number, file: FileInfo) => void;
}

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
    playContainer: {
        alignItems: 'center',
        height: '100%',
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
    },
    play: {
        backgroundColor: changeOpacity('#000', 0.16),
        borderRadius: 20,
    },
}));

const VideoFile = ({
    index, file, forwardRef, inViewPort, isSingleImage,
    resizeMode = 'cover', wrapperWidth, updateFileForGallery,
}: Props) => {
    const serverUrl = useServerUrl();
    const [failed, setFailed] = useState(false);
    const dimensions = useWindowDimensions();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const mounted = useRef(false);
    const [video, setVideo] = useState({...file});

    const imageDimensions = useMemo(() => {
        if (isSingleImage) {
            const viewPortHeight = Math.max(dimensions.height, dimensions.width) * 0.45;
            return calculateDimensions(video.height, video.width, wrapperWidth, viewPortHeight);
        }

        return undefined;
    }, [dimensions.height, dimensions.width, video.height, video.width, wrapperWidth]);

    const getThumbnail = async () => {
        let client: Client | undefined;
        try {
            client = NetworkManager.getClient(serverUrl);
        } catch {
            return;
        }

        const data = {...file};
        try {
            const exists = data.mini_preview ? await fileExists(data.mini_preview) : false;
            if (!data.mini_preview || !exists) {
                // We use the public link to avoid having to pass the token through a third party
                // library
                const publicUri = await client!.getFilePublicLink(data.id!);
                const {uri, height, width} = await getThumbnailAsync(publicUri!.link, {time: 2000});
                data.mini_preview = uri;
                data.height = height;
                data.width = width;
                updateLocalFile(serverUrl, data);
                if (mounted.current) {
                    setVideo(data);
                }
            }
        } catch (error) {
            data.mini_preview = client!.getFilePreviewUrl(data.id!, 0);
            if (mounted.current) {
                setVideo(data);
            }
        } finally {
            const {width: tw, height: th} = calculateDimensions(
                data.height,
                data.width,
                dimensions.width - 60, // size of the gallery header probably best to set that as a constant
                dimensions.height,
            );
            data.height = th;
            data.width = tw;
            updateFileForGallery(index, data);
        }
    };

    const handleError = useCallback(() => {
        setFailed(true);
    }, []);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        getThumbnail();
    }, [file]);

    const imageProps = () => {
        const props: ProgressiveImageProps = {
            imageUri: video.mini_preview,
            inViewPort,
        };

        return props;
    };

    let thumbnail = (
        <ProgressiveImage
            id={file.id!}
            forwardRef={forwardRef}
            style={[isSingleImage ? null : style.imagePreview, imageDimensions]}
            onError={handleError}
            resizeMode={resizeMode}
            {...imageProps()}
        />
    );

    if (failed) {
        thumbnail = (
            <View style={[isSingleImage ? null : style.imagePreview, style.failed, imageDimensions]}>
                <FileIcon
                    failed={failed}
                    file={file}
                />
            </View>
        );
    }

    return (
        <View
            style={style.fileImageWrapper}
        >
            {!isSingleImage && <View style={style.boxPlaceholder}/>}
            {thumbnail}
            <View style={style.playContainer}>
                <CompassIcon
                    color={changeOpacity('#fff', 0.8)}
                    style={style.play}
                    name='play'
                    size={40}
                />
            </View>
        </View>
    );
};

export default VideoFile;
