// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useEffect, useState} from 'react';
import {Text, View} from 'react-native';

import {buildFilePreviewUrl, buildFileThumbnailUrl} from '@actions/remote/file';
import FileIcon from '@app/components/files/file_icon';
import ProgressiveImage from '@app/components/progressive_image';
import {useServerUrl} from '@app/context/server';
import {FileTypes} from '@app/utils/file/constants';
import {getFormat, getFormattedFileSize} from '@utils/file';

import {getStyleSheet} from './styles';

import type FileModel from '@typings/database/models/servers/file';
import type PostModel from '@typings/database/models/servers/post';

type CardProps = {
    post: PostModel;
    theme: Theme;
};

export const FileCard: React.FC<CardProps> = ({post, theme}) => {
    const [files, setFiles] = useState<FileModel[]>([]);
    const [failed, setFailed] = useState(false);
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    useEffect(() => {
        const fetchFiles = async () => {
            const fetchedFiles = await post.files.fetch();
            setFiles(fetchedFiles);
        };

        fetchFiles();
    }, [post]);

    const handleError = useCallback(() => {
        setFailed(true);
    }, []);

    let file = null;
    if (files.length > 0) {
        const extension = files[0].extension;
        const thumbnailUri = buildFileThumbnailUrl(serverUrl, files[0].id);
        const imageUri = buildFilePreviewUrl(serverUrl, files[0].id);
        const fileType = getFormat(extension);

        switch (fileType) {
            case FileTypes.IMAGE:
                file = (
                    <View
                        style={styles.previewThreadContainer}
                    >
                        <View style={styles.imageContainer}>
                            <ProgressiveImage
                                style={styles.imagePreview}
                                thumbnailUri={thumbnailUri}
                                imageUri={imageUri}
                                id={files[0].id!}
                                onError={handleError}
                            />
                        </View>

                        {files.length > 0 && (
                            <View
                                style={styles.fileContainer}
                            >
                                <Text
                                    style={styles.nameContainer}
                                    numberOfLines={1}
                                >
                                    {files[0].name}
                                </Text>
                                <Text
                                    style={styles.sizeContainer}
                                >
                                    {`${getFormattedFileSize(files[0].size)}`}
                                </Text>
                            </View>
                        )}
                    </View>
                );
                if (failed) {
                    file = (
                        <View
                            style={styles.previewThreadContainer}
                        >
                            <View
                                style={styles.fileContainer}
                            >
                                <Text
                                    style={styles.nameContainer}
                                    numberOfLines={1}
                                >
                                    {files[0].name}
                                </Text>
                                <Text
                                    style={styles.sizeContainer}
                                >
                                    {`${getFormattedFileSize(files[0].size)}`}
                                </Text>
                            </View>
                        </View>
                    );
                }
                return file;
            default:
                file = (
                    <View
                        style={styles.previewThreadContainer}
                    >
                        <View style={styles.imageContainer}>
                            <FileIcon
                                file={files[0].toFileInfo(post.author.id)}
                            />
                        </View>

                        {files.length > 0 && (
                            <View
                                style={styles.fileContainer}
                            >
                                <Text
                                    style={styles.nameContainer}
                                    numberOfLines={1}
                                >
                                    {files[0].name}
                                </Text>
                                <Text
                                    style={styles.sizeContainer}
                                >
                                    {`${getFormattedFileSize(files[0].size)}`}
                                </Text>
                            </View>
                        )}
                    </View>

                );
                return file;
        }
    }
    return null;
};

export default FileCard;

