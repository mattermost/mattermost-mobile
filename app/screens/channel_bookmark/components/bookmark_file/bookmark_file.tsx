// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Button} from '@rneui/base';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, Platform, type Insets} from 'react-native';
import {Shadow} from 'react-native-shadow-2';

import {uploadFile} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import FileIcon from '@components/files/file_icon';
import FormattedText from '@components/formatted_text';
import ProgressBar from '@components/progress_bar';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {fileSizeWarning, getExtensionFromMime, getFormattedFileSize} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {ClientResponse} from '@mattermost/react-native-network-client';

type Props = {
    channelId: string;
    close: () => void;
    disabled: boolean;
    initialFile?: FileInfo;
    maxFileSize: number;
    setBookmark: (file: ExtractedFileInfo) => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    viewContainer: {
        marginTop: 32,
        marginBottom: 24,
        width: '100%',
        flex: 0,
    },
    title: {
        color: theme.centerChannelColor,
        marginBottom: 8,
        ...typography('Heading', 100, 'SemiBold'),
    },
    shadowContainer: {
        alignItems: 'center',
        borderColor: changeOpacity(theme.centerChannelColor, 0.16),
        borderWidth: 1,
        borderRadius: 4,
    },
    fileContainer: {
        height: 64,
        flexDirection: 'row',
        paddingLeft: 12,
        alignItems: 'center',
    },
    fileInfoContainer: {
        paddingHorizontal: 16,
        flex: 1,
        justifyContent: 'center',
    },
    filename: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    fileInfo: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        textTransform: 'uppercase',
        ...typography('Body', 75),
    },
    uploadError: {
        color: theme.errorTextColor,
        ...typography('Body', 75),
    },
    retry: {
        paddingRight: 20,
        height: 40,
        justifyContent: 'center',
    },
    removeContainer: {
        position: 'absolute',
        elevation: 11,
        top: -18,
        right: -12,
        width: 24,
        height: 24,
    },
    removeButton: {
        borderRadius: 12,
        alignSelf: 'center',
        marginTop: Platform.select({
            ios: 5.4,
            android: 4.75,
        }),
        backgroundColor: theme.centerChannelBg,
        width: 24,
        height: 25,
    },
    uploading: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75),
    },
    progressContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        bottom: 2,
        borderBottomRightRadius: 4,
        borderBottomLeftRadius: 4,
    },
    progress: {
        borderRadius: 4,
        borderTopRightRadius: 0,
        borderTopLeftRadius: 0,
    },
}));

const shadowSides = {top: false, bottom: true, end: true, start: false};
const hitSlop: Insets = {top: 10, bottom: 10, left: 10, right: 10};

const BookmarkFile = ({channelId, close, disabled, initialFile, maxFileSize, setBookmark}: Props) => {
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const [file, setFile] = useState<ExtractedFileInfo|undefined>(initialFile);
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [failed, setFailed] = useState(false);
    const styles = getStyleSheet(theme);
    const subContainerStyle = useMemo(() => [styles.viewContainer, {paddingHorizontal: isTablet ? 42 : 0}], [isTablet]);
    const cancelUpload = useRef<() => void | undefined>();

    const onProgress = useCallback((p: number, bytes: number) => {
        if (!file) {
            return;
        }

        const f: ExtractedFileInfo = {...file};
        f.bytesRead = bytes;

        setProgress(p);
        setFile(f);
    }, []);

    const onComplete = useCallback((response: ClientResponse) => {
        cancelUpload.current = undefined;
        if (response.code !== 201 || !response.data) {
            setUploadError();
            return;
        }

        const data = response.data.file_infos as FileInfo[] | undefined;
        if (!data?.length) {
            setUploadError();
            return;
        }

        const fileInfo = data[0];
        setFile(fileInfo);
        setBookmark(fileInfo);
        setUploading(false);
        setProgress(1);
        setFailed(false);
        setError('');
    }, []);

    const onError = useCallback(() => {
        cancelUpload.current = undefined;
        setUploadError();
    }, []);

    const setUploadError = useCallback(() => {
        setProgress(0);
        setUploading(false);
        setFailed(true);

        setError(intl.formatMessage({
            id: 'channel_bookmark.add.file_upload_error',
            defaultMessage: 'Error uploading file. Please try again.',
        }));
    }, [file, intl]);

    const startUpload = useCallback((fileInfo: FileInfo | ExtractedFileInfo) => {
        setUploading(true);
        setProgress(0);

        const {cancel, error: uploadError} = uploadFile(
            serverUrl,
            fileInfo,
            channelId,
            onProgress,
            onComplete,
            onError,
            fileInfo.bytesRead,
            true,
        );

        if (cancel) {
            cancelUpload.current = cancel;
        }

        if (uploadError) {
            setUploadError();
            cancelUpload.current?.();
        }
    }, [channelId, onProgress, onComplete, onError, serverUrl]);

    const browseFile = useCallback(async () => {
        const picker = new PickerUtil(intl, (files) => {
            if (files.length) {
                const f = files[0];
                const extension = getExtensionFromMime(f.mime_type) || '';
                const fileWithExtension: ExtractedFileInfo = {...f, extension};
                setFile(fileWithExtension);
                startUpload(fileWithExtension);
            }
        });

        const res = await picker.attachFileFromFiles(undefined, false);
        if (res.error) {
            close();
        }
    }, [close, startUpload]);

    const removeAndUpload = useCallback(() => {
        cancelUpload.current?.();
        browseFile();
    }, [file, browseFile]);

    const retry = useCallback(() => {
        cancelUpload.current?.();
        if (file) {
            startUpload(file);
        }
    }, [file, startUpload]);

    useEffect(() => {
        if (!initialFile) {
            browseFile();
        }

        return () => {
            cancelUpload.current?.();
        };
    }, []);

    useEffect(() => {
        if (uploading) {
            return;
        }

        if (!file?.id && (file?.size || 0) > maxFileSize) {
            setError(fileSizeWarning(intl, maxFileSize));
            return;
        }

        if (!file?.id && file?.name) {
            setBookmark(file);
        }
    }, [file, intl, maxFileSize, uploading]);

    let info;
    if (error) {
        info = (
            <Text style={styles.uploadError}>
                {error}
            </Text>
        );
    } else if (uploading) {
        info = (
            <FormattedText
                id='channel_bookmark.add.file_uploading'
                defaultMessage='Uploading... ({progress}%)'
                values={{progress: Math.ceil(progress * 100)}}
                style={styles.uploading}
            />
        );
    } else if (file) {
        info = (
            <Text style={styles.fileInfo}>
                {`${file.extension} ${getFormattedFileSize(file.size || 0)}`}
            </Text>
        );
    }

    if (file) {
        return (
            <View style={subContainerStyle}>
                <FormattedText
                    id='channel_bookmark.add.file_title'
                    defaultMessage='Attachment'
                    style={styles.title}
                />
                <Shadow
                    style={styles.shadowContainer}
                    startColor='rgba(61, 60, 64, 0.08)'
                    distance={4}
                    sides={shadowSides}
                >
                    <View style={styles.fileContainer}>
                        <FileIcon file={file}/>
                        <View style={styles.fileInfoContainer}>
                            <Text
                                numberOfLines={1}
                                ellipsizeMode='tail'
                                style={styles.filename}
                            >
                                {file.name.trim()}
                            </Text>
                            {info}
                        </View>
                        {failed &&
                        <Button
                            onPress={retry}
                            containerStyle={styles.retry}
                        >
                            <CompassIcon
                                color={changeOpacity(theme.centerChannelColor, 0.56)}
                                name='refresh'
                                size={20}
                            />
                        </Button>
                        }
                    </View>
                    <TouchableWithFeedback
                        disabled={disabled}
                        hitSlop={hitSlop}
                        style={styles.removeContainer}
                        onPress={removeAndUpload}
                        type='opacity'
                    >
                        <View style={styles.removeButton}>
                            <CompassIcon
                                name='close-circle'
                                color={changeOpacity(theme.centerChannelColor, disabled ? 0.16 : 0.56)}
                                size={24}
                            />
                        </View>
                    </TouchableWithFeedback>
                </Shadow>
                {uploading &&
                <View style={styles.progressContainer}>
                    <ProgressBar
                        progress={progress}
                        color={theme.buttonBg}
                        style={styles.progress}
                    />
                </View>
                }
            </View>
        );
    }

    return null;
};

export default BookmarkFile;
