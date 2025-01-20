// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useMemo, useState} from 'react';

import {getLocalFileInfo} from '@actions/local/file';
import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import {useServerUrl} from '@context/server';
import {isGif, isImage, isVideo} from '@utils/file';
import {getImageSize} from '@utils/gallery';

import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';

const getFileInfo = async (serverUrl: string, bookmarks: ChannelBookmarkModel[], publicLinkEnabled: boolean, cb: (files: FileInfo[]) => void) => {
    const fileInfos: FileInfo[] = [];
    for await (const b of bookmarks) {
        if (b.fileId) {
            const res = await getLocalFileInfo(serverUrl, b.fileId);
            if (res.file) {
                const fileInfo = res.file.toFileInfo(b.ownerId);
                const imageFile = isImage(fileInfo);
                const videoFile = isVideo(fileInfo);

                let uri;
                if (imageFile || (videoFile && publicLinkEnabled)) {
                    if (fileInfo.localPath) {
                        uri = fileInfo.localPath;
                    } else {
                        uri = (isGif(fileInfo) || (imageFile && !fileInfo.has_preview_image) || videoFile) ? buildFileUrl(serverUrl, fileInfo.id!) : buildFilePreviewUrl(serverUrl, fileInfo.id!);
                    }
                } else {
                    uri = fileInfo.localPath || buildFileUrl(serverUrl, fileInfo.id!);
                }

                let {width, height} = fileInfo;
                if (imageFile && !width) {
                    const size = await getImageSize(uri);
                    width = size.width;
                    height = size.height;
                }

                fileInfos.push({...fileInfo, uri, width, height});
            }
        }
    }

    if (fileInfos.length) {
        cb(fileInfos);
    }
};

export const useImageAttachments = (filesInfo: FileInfo[]) => {
    const serverUrl = useServerUrl();
    return useMemo(() => {
        return filesInfo.reduce(({images, nonImages}: {images: FileInfo[]; nonImages: FileInfo[]}, file) => {
            const imageFile = isImage(file);
            const videoFile = isVideo(file);
            if (imageFile || videoFile) {
                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    // If no local path and no id, we skip the image
                    if (!file.id) {
                        return {images, nonImages};
                    }
                    uri = (isGif(file) || videoFile) ? buildFileUrl(serverUrl, file.id) : buildFilePreviewUrl(serverUrl, file.id);
                }
                images.push({...file, uri});
            } else {
                nonImages.push({...file});
            }
            return {images, nonImages};
        }, {images: [], nonImages: []});
    }, [filesInfo, serverUrl]);
};

export const useChannelBookmarkFiles = (bookmarks: ChannelBookmarkModel[], publicLinkEnabled: boolean) => {
    const serverUrl = useServerUrl();
    const [files, setFiles] = useState<FileInfo[]>([]);

    useEffect(() => {
        getFileInfo(serverUrl, bookmarks, publicLinkEnabled, setFiles);
    }, [serverUrl, bookmarks, publicLinkEnabled]);

    return files;
};
