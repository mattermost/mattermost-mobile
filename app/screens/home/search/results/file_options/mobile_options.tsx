// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import {useServerUrl} from '@app/context/server';
import {GalleryAction} from '@typings/screens/gallery';

import Header from './header';
import OptionMenus from './option_menus';
import Toasts from './toasts';

type Props = {
    canDownloadFiles?: boolean;
    fileInfo: FileInfo;
    publicLinkEnabled?: boolean;
    setSelectedItemNumber?: (index: number | undefined) => void;
}
const MobileOptions = ({
    canDownloadFiles,
    fileInfo,
    publicLinkEnabled,
    setSelectedItemNumber,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [action, setAction] = useState<GalleryAction>('none');

    const handleDownload = useCallback(() => {
        setAction('downloading');
        setSelectedItemNumber?.(undefined);
    }, []);

    const handleCopyLink = useCallback(() => {
        setAction('copying');
        setSelectedItemNumber?.(undefined);
    }, []);

    const handlePermalink = useCallback(() => {
        showPermalink(serverUrl, '', fileInfo.post_id, intl);
        setSelectedItemNumber?.(undefined);
    }, [fileInfo.post_id, intl, serverUrl, setSelectedItemNumber]);

    return (
        <>
            <Header fileInfo={fileInfo}/>
            <OptionMenus
                canDownloadFiles={canDownloadFiles}
                enablePublicLink={publicLinkEnabled}
                handleCopyLink={handleCopyLink}
                handleDownload={handleDownload}
                handlePermalink={handlePermalink}
            />
            <Toasts
                action={action}
                fileInfo={fileInfo}
                setAction={setAction}
                setSelectedItemNumber={setSelectedItemNumber}
            />
        </>
    );
};

export default MobileOptions;
