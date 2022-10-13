// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {EdgeInsets} from 'react-native-safe-area-context';

import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {bottomSheet} from '@screens/navigation';
import {GalleryAction} from '@typings/screens/gallery';
import {bottomSheetSnapPoint} from '@utils/helpers';

import Header, {HEADER_HEIGHT} from './header';
import OptionMenus from './option_menus';

type Props = {
    fileInfo: FileInfo;
    insets: EdgeInsets;
    numOptions: number;
    setAction: (action: GalleryAction) => void;
    theme: Theme;
}

export const showMobileOptionsBottomSheet = ({
    fileInfo,
    insets,
    numOptions,
    setAction,
    theme,
}: Props) => {
    const renderContent = () => (
        <>
            <Header fileInfo={fileInfo}/>
            <OptionMenus
                setAction={setAction}
                fileInfo={fileInfo}
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
