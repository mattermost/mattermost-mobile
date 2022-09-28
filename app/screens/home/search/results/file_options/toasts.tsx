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
    const galleryItem = {...fileInfo, type: 'image'} as GalleryItemType;
    return (
        <>
            {action === 'downloading' &&
                <DownloadWithAction
                    action={action}
                    item={galleryItem}
                    galleryView={false}
                    setAction={setAction}
                />
            }
            {action === 'copying' &&
                <CopyPublicLink
                    item={galleryItem}
                    galleryView={false}
                    setAction={setAction}
                />
            }
        </>
    );
};

export default Toasts;
