// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import {GalleryAction} from '@typings/screens/gallery';

import {useHandleFileOptions} from '../hooks';

type Props = {
    action: GalleryAction;
    canDownloadFiles?: boolean;
    enablePublicLink?: boolean;
    fileInfo: FileInfo;
    setAction: (action: GalleryAction) => void;
}
const OptionMenus = ({
    action,
    canDownloadFiles,
    enablePublicLink,
    fileInfo,
    setAction,
}: Props) => {
    const intl = useIntl();

    const {handleCopyLink, handleDownload, handlePermalink} = useHandleFileOptions(
        {
            action,
            postId: fileInfo.post_id,
            setAction,
        });

    return (
        <>
            {canDownloadFiles &&
                <OptionItem
                    key={'download'}
                    action={handleDownload}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.download', defaultMessage: 'Download'})}
                    icon={'download-outline'}
                    type='default'
                />
            }
            <OptionItem
                key={'permalink'}
                action={handlePermalink}
                label={intl.formatMessage({id: 'screen.search.results.file_options.open_in_channel', defaultMessage: 'Open in channel'})}
                icon={'globe'}
                type='default'
            />
            {enablePublicLink &&
                <OptionItem
                    key={'link'}
                    action={handleCopyLink}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.copy_link', defaultMessage: 'Copy link'})}
                    icon={'link-variant'}
                    type='default'
                />
            }
        </>
    );
};

export default OptionMenus;
