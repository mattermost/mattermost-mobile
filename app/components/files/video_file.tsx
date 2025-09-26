// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getThumbnailAsync} from 'expo-video-thumbnails';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';

import {updateLocalFile} from '@actions/local/file';
import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import ProgressiveImage from '@components/progressive_image';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getServerCredentials} from '@init/credentials';
import {fileExists} from '@utils/file';
import {calculateDimensions} from '@utils/images';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import FileIcon from './file_icon';

import type {ImageContentFit} from 'expo-image';

type Props = {
    index: number;
    file: FileInfo;
    forwardRef?: React.RefObject<unknown>;
    inViewPort?: boolean;
    isSingleImage?: boolean;
    contentFit?: ImageContentFit;
    wrapperWidth: number;
    updateFileForGallery?: (idx: number, file: FileInfo) => void;
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
        justifyContent: 'center',
        ...StyleSheet.absoluteFillObject,
    },
    play: {
        backgroundColor: changeOpacity('#000', 0.16),
        borderRadius: 20,
    },
}));

const VideoFile = ({
    index, file, forwardRef, inViewPort, isSingleImage,
    contentFit = 'cover', wrapperWidth, updateFileForGallery,
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
            return calculateDimensions(video.height || wrapperWidth, video.width || wrapperWidth, wrapperWidth, viewPortHeight);
        }
        return undefined;
    }, [dimensions.height, dimensions.width, video.height, video.width, wrapperWidth, isSingleImage]);

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
        if (!inViewPort) {
            return;
        }

        const getThumbnail = async () => {
            const data = {...file};
            try {
                const exists = data.mini_preview ? await fileExists(data.mini_preview) : false;
                if (!data.mini_preview || !exists) {
                    const videoUrl = buildFileUrl(serverUrl, data.id!);
                    if (videoUrl) {
                        const cred = await getServerCredentials(serverUrl);
                        const headers: Record<string, string> = {};
                        if (cred?.token) {
                            headers.Authorization = `Bearer ${cred.token}`;
                        }
                        const {uri, height, width} = await getThumbnailAsync(data.localPath || videoUrl, {time: 1000, headers});
                        data.mini_preview = uri;
                        data.height = height;
                        data.width = width;
                        updateLocalFile(serverUrl, data);
                        if (mounted.current) {
                            setVideo(data);
                            setFailed(false);
                        }
                    }
                }
            } catch (error) {
                data.mini_preview = buildFilePreviewUrl(serverUrl, data.id!);
                if (mounted.current) {
                    setVideo(data);
                }
            } finally {
                if (!data.width) {
                    data.height = wrapperWidth;
                    data.width = wrapperWidth;
                }
                const {width: tw, height: th} = calculateDimensions(
                    data.height,
                    data.width,
                    dimensions.width - 60, // size of the gallery header probably best to set that as a constant
                    dimensions.height,
                );
                data.height = th;
                data.width = tw;
                updateFileForGallery?.(index, data);
            }
        };

        getThumbnail();

        // Only get the thumbnail when the file changes or the file gets into the viewport
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, inViewPort]);

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
            contentFit={contentFit}
            theme={theme}
            {...imageProps()}
        />
    );

    if (failed) {
        thumbnail = (
            <View

                // @ts-expect-error ref of type unknown
                ref={forwardRef}
                style={[isSingleImage ? null : {height: '100%'}, style.failed, imageDimensions]}
            >
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
            {!isSingleImage && !failed && <View style={style.boxPlaceholder}/>}
            {thumbnail}
            <View style={style.playContainer}>
                <View style={style.play}>
                    <CompassIcon
                        color={changeOpacity('#fff', 0.8)}
                        name='play'
                        size={40}
                    />
                </View>
            </View>
        </View>
    );
};

export default VideoFile;
