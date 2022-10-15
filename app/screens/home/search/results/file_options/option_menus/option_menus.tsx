// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet} from '@screens/navigation';
import {GalleryAction} from '@typings/screens/gallery';

type Props = {
    canDownloadFiles?: boolean;
    enablePublicLink?: boolean;
    fileInfo: FileInfo;
    setAction: (action: GalleryAction) => void;
}
const OptionMenus = ({
    canDownloadFiles,
    enablePublicLink,
    fileInfo,
    setAction,
}: Props) => {
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const intl = useIntl();

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
        if (fileInfo.post_id) {
            showPermalink(serverUrl, '', fileInfo.post_id, intl);
            setAction('opening');
        }
    }, [intl, serverUrl, fileInfo.post_id, setAction]);

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
                    key={'copylink'}
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
