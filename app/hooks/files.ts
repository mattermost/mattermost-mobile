// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';

import {buildFilePreviewUrl, buildFileUrl} from '@actions/remote/file';
import {useServerUrl} from '@context/server';
import {isGif, isImage, isVideo} from '@utils/file';

export const useImageAttachments = (filesInfo: FileInfo[], publicLinkEnabled: boolean) => {
    const serverUrl = useServerUrl();
    return useMemo(() => {
        return filesInfo.reduce(({images, nonImages}: {images: FileInfo[]; nonImages: FileInfo[]}, file) => {
            const imageFile = isImage(file);
            const videoFile = isVideo(file);
            if (imageFile || (videoFile && publicLinkEnabled)) {
                let uri;
                if (file.localPath) {
                    uri = file.localPath;
                } else {
                    uri = (isGif(file) || videoFile) ? buildFileUrl(serverUrl, file.id!) : buildFilePreviewUrl(serverUrl, file.id!);
                }
                images.push({...file, uri});
            } else {
                let uri = file.uri;
                if (videoFile) {
                    // fallback if public links are not enabled
                    uri = buildFileUrl(serverUrl, file.id!);
                }

                nonImages.push({...file, uri});
            }
            return {images, nonImages};
        }, {images: [], nonImages: []});
    }, [filesInfo, publicLinkEnabled]);
};

