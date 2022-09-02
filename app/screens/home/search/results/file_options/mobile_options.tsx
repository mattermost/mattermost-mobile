// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {EdgeInsets} from 'react-native-safe-area-context';

import {ITEM_HEIGHT} from '@app/components/slide_up_panel_item';
import {bottomSheet} from '@app/screens/navigation';
import {bottomSheetSnapPoint} from '@app/utils/helpers';

import Header, {HEADER_HEIGHT} from './header';
import OptionMenus from './option_menus';

type Props = {
    canDownloadFiles?: boolean;
    fileInfo: FileInfo;
    handleCopyLink: () => void;
    handleDownload: () => void;
    handlePermalink: () => void;
    insets: EdgeInsets;
    numOptions: number;
    publicLinkEnabled?: boolean;
    theme: Theme;
}

export const showMobileOptionsBottomSheet = ({
    canDownloadFiles,
    fileInfo,
    handleCopyLink,
    handleDownload,
    handlePermalink,
    insets,
    numOptions,
    publicLinkEnabled,
    theme,
}: Props) => {
    const renderContent = () => (
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

    bottomSheet({
        closeButtonId: 'close-search-file-options',
        renderContent,
        snapPoints: [
            bottomSheetSnapPoint(numOptions, ITEM_HEIGHT, insets.bottom) + HEADER_HEIGHT, 10,
        ],
        theme,
        title: '',
    });
};
