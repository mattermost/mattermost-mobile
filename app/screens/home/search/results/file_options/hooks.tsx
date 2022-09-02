// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import {useServerUrl} from '@app/context/server';
import {dismissBottomSheet} from '@app/screens/navigation';
import {GalleryAction} from '@typings/screens/gallery';

type Props = {
    lastViewedIndex: number | undefined;
    orderedFilesForGallery: FileInfo[];
    setSelectedItemNumber: (value: number | undefined) => void;
}

export const useHandleFileOptions = ({
    lastViewedIndex,
    orderedFilesForGallery,
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
        showPermalink(serverUrl, '', orderedFilesForGallery[lastViewedIndex!].post_id, intl);

        // dismissBottomSheet();
        setSelectedItemNumber(undefined);
    }, [intl, serverUrl, orderedFilesForGallery, setSelectedItemNumber, lastViewedIndex]);

    return useMemo(() => {
        return {
            handleCopyLink,
            handleDownload,
            handlePermalink,
            action,
            setAction,
        };
    }, [action, lastViewedIndex, orderedFilesForGallery, setAction, setSelectedItemNumber]);
};
