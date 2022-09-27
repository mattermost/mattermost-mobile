// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import {useServerUrl} from '@app/context/server';
import {ChannelModel} from '@app/database/models/server';
import {useIsTablet} from '@app/hooks/device';
import {useImageAttachments} from '@app/hooks/files';
import {dismissBottomSheet} from '@app/screens/navigation';
import {GalleryAction} from '@typings/screens/gallery';
import {fileToGalleryItem} from '@utils/gallery';

type Props = {
    action: GalleryAction;
    postId?: string | undefined;
    setAction: (action: GalleryAction) => void;
}

export const useHandleFileOptions = ({
    action,
    postId,
    setAction,
}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const isTablet = useIsTablet();

    const handleDownload = useCallback(() => {
        if (!isTablet) {
            dismissBottomSheet();
        }
        setAction('downloading');
    }, [setAction]);

    const handleCopyLink = useCallback(() => {
        if (!isTablet) {
            dismissBottomSheet();
        }
        setAction('copying');
    }, [setAction]);

    const handlePermalink = useCallback(() => {
        if (postId) {
            showPermalink(serverUrl, '', postId, intl);
            setAction('opening');
        }
    }, [intl, serverUrl, postId]);

    return useMemo(() => {
        return {
            handleCopyLink,
            handleDownload,
            handlePermalink,
        };
    }, [action, handleCopyLink, handleDownload, handlePermalink, postId, setAction]);
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

