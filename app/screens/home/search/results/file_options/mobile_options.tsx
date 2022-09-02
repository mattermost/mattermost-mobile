// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import Header from './header';
import OptionMenus from './option_menus';

type Props = {
    canDownloadFiles?: boolean;
    fileInfo: FileInfo;
    handleCopyLink: () => void;
    handleDownload: () => void;
    handlePermalink: () => void;
    publicLinkEnabled?: boolean;
}
const MobileOptions = ({
    canDownloadFiles,
    fileInfo,
    handleCopyLink,
    handleDownload,
    handlePermalink,
    publicLinkEnabled,
}: Props) => {
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
        </>
    );
};

export default MobileOptions;
