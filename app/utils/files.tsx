// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fileToGalleryItem} from '@utils/gallery';

import type ChannelModel from '@typings/database/models/servers/channel';

export const getNumberFileMenuOptions = (canDownloadFiles: boolean, enableSecureFilePreview: boolean, publicLinkEnabled: boolean) => {
    let numberItems = 1;
    numberItems += !enableSecureFilePreview && canDownloadFiles ? 1 : 0;
    numberItems += !enableSecureFilePreview && publicLinkEnabled ? 1 : 0;
    return numberItems;
};

// return an object with key:value of channelID:channelDisplayName
export const getChannelNamesWithID = (fileChannels: ChannelModel[]) => {
    return fileChannels.reduce<{[id: string]: string | undefined}>((acc, v) => {
        acc[v.id] = v.displayName;
        return acc;
    }, {});
};

// return array of fileInfos (image and non-image) sorted by create_at date
export const getOrderedFileInfos = (fileInfos: FileInfo[]) => {
    return fileInfos.sort((a: FileInfo, b: FileInfo) => {
        return (b.create_at || 0) - (a.create_at || 0);
    });
};

// returns object with keys of fileInfo.id and value of the ordered index from
// orderedFilesForGallery
export const getFileInfosIndexes = (orderedFilesForGallery: FileInfo[]) => {
    return orderedFilesForGallery.reduce<{[id: string]: number | undefined}>((acc, v, idx) => {
        if (v.id) {
            acc[v.id] = idx;
        }
        return acc;
    }, {});
};

// return ordered FileInfo[] converted to GalleryItemType[]
export const getOrderedGalleryItems = (orderedFileInfos: FileInfo[]) => {
    return orderedFileInfos.map((f) => fileToGalleryItem(f, f.user_id));
};
