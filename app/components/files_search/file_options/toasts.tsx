// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';

import CopyPublicLink from '@screens/gallery/footer/copy_public_link';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';

import type {GalleryAction, GalleryItemType} from '@typings/screens/gallery';

type Props = {
    action: GalleryAction;
    fileInfo: FileInfo | undefined;
    setAction: (action: GalleryAction) => void;
}
const Toasts = ({
    action,
    fileInfo,
    setAction,
}: Props) => {
    const galleryItem = {...fileInfo, type: fileInfo?.mime_type.startsWith('image/') ? 'image' : 'file'} as GalleryItemType;

    switch (action) {
        case 'downloading':
            return (
                <DownloadWithAction
                    action={action}
                    enableSecureFilePreview={false}
                    galleryView={false}
                    item={galleryItem}
                    setAction={setAction}
                />
            );
        case 'copying':
            return (
                <CopyPublicLink
                    galleryView={false}
                    item={galleryItem}
                    setAction={setAction}
                />
            );

        default:
            return null;
    }
};

export default Toasts;
