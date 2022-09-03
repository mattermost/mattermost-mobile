// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import {useServerUrl} from '@app/context/server';
import {ChannelModel} from '@app/database/models/server';
import {useImageAttachments} from '@app/hooks/files';
import {dismissBottomSheet} from '@app/screens/navigation';
import {GalleryAction} from '@typings/screens/gallery';
import {fileToGalleryItem} from '@utils/gallery';

type Props = {
    postId?: string | undefined;
    setSelectedItemNumber: (value: number | undefined) => void;
}

export const useHandleFileOptions = ({
    postId,
    setSelectedItemNumber,
}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const [action, setAction] = useState<GalleryAction>('none');

    const handleDownload = useCallback(() => {
        dismissBottomSheet();
        setAction('downloading');
        setSelectedItemNumber?.(undefined);
    }, [setSelectedItemNumber]);

    const handleCopyLink = useCallback(() => {
        dismissBottomSheet();
        setAction('copying');
        setSelectedItemNumber?.(undefined);
    }, [setSelectedItemNumber]);

    const handlePermalink = useCallback(() => {
        if (postId) {
            showPermalink(serverUrl, '', postId, intl);
        }

        // dismissBottomSheet();
        setSelectedItemNumber(undefined);
    }, [intl, serverUrl, postId, setSelectedItemNumber]);

    return useMemo(() => {
        return {
            handleCopyLink,
            handleDownload,
            handlePermalink,
            action,
            postId,
            setAction,
        };
    }, [action, setAction, setSelectedItemNumber]);
};

export const useNumberItems = (canDownloadFiles: boolean, publicLinkEnabled: boolean) => {
    return useMemo(() => {
        let numberItems = 1;
        numberItems += canDownloadFiles ? 1 : 0;
        numberItems += publicLinkEnabled ? 1 : 0;
        return numberItems;
    }, [canDownloadFiles, publicLinkEnabled]);
};

// return an object with key:value of channelID:channelDisplayName
export const useChannelNames = (fileChannels: ChannelModel[]) => {
    return useMemo(() => fileChannels.reduce<{[id: string]: string | undefined}>((acc, v) => {
        acc[v.id] = v.displayName;
        return acc;
    }, {}), [fileChannels]);
};

// return array of fileInfos (image and non-image) sorted by create_at date
export const useOrderedFileInfos = (fileInfos: FileInfo[], publicLinkEnabled: boolean) => {
    const {images: imageAttachments, nonImages: nonImageAttachments} = useImageAttachments(fileInfos, publicLinkEnabled);
    return useMemo(() => {
        const filesForGallery = imageAttachments.concat(nonImageAttachments);
        return filesForGallery.sort((a: FileInfo, b: FileInfo) => {
            return (b.create_at || 0) - (a.create_at || 0);
        });
    }, [imageAttachments, nonImageAttachments]);
};

// returns object with keys of fileInfo.id and key of the ordered index from
// orderedFilesForGallery
export const useFileInfosIndexes = (orderedFilesForGallery: FileInfo[]) => {
    return useMemo(() => {
        return orderedFilesForGallery.reduce<{[id: string]: number | undefined}>((acc, v, idx) => {
            if (v.id) {
                acc[v.id] = idx;
            }
            return acc;
        }, {});
    }, [orderedFilesForGallery]);
};

// return ordered FileInfo[] converted to GalleryItemType[]
export const useOrderedGalleryItems = (orderedFileInfos: FileInfo[]) => {
    return useMemo(() => {
        return orderedFileInfos.map((f) => fileToGalleryItem(f, f.user_id));
    }, [orderedFileInfos]);
};

