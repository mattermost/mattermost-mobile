// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {showPermalink} from '@actions/remote/permalink';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {useIsTablet} from '@hooks/device';
import {dismissBottomSheet} from '@screens/navigation';

import type {GalleryAction} from '@typings/screens/gallery';

type Props = {
    canDownloadFiles?: boolean;
    enablePublicLink?: boolean;
    enableSecureFilePreview: boolean;
    fileInfo: FileInfo;
    setAction: (action: GalleryAction) => void;
}
const OptionMenus = ({
    canDownloadFiles,
    enablePublicLink,
    enableSecureFilePreview,
    fileInfo,
    setAction,
}: Props) => {
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const intl = useIntl();

    const handleDownload = useCallback(async () => {
        if (!isTablet) {
            await dismissBottomSheet();
        }
        setAction('downloading');
    }, [setAction]);

    const handleCopyLink = useCallback(async () => {
        if (!isTablet) {
            await dismissBottomSheet();
        }
        setAction('copying');
    }, [setAction]);

    const handlePermalink = useCallback(async () => {
        if (fileInfo.post_id) {
            if (!isTablet) {
                await dismissBottomSheet();
            }
            showPermalink(serverUrl, '', fileInfo.post_id);
            setAction('opening');
        }
    }, [intl, serverUrl, fileInfo.post_id, setAction]);

    return (
        <>
            {(!enableSecureFilePreview && canDownloadFiles) &&
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
            {(!enableSecureFilePreview && enablePublicLink) &&
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
