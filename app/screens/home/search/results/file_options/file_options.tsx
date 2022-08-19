// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, StyleSheet} from 'react-native';

import {showPermalink} from '@actions/remote/permalink';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import CopyPublicLink from '@screens/gallery/footer/copy_public_link';
import DownloadWithAction from '@screens/gallery/footer/download_with_action';

import Header from './header';

import type {GalleryAction, GalleryItemType} from '@typings/screens/gallery';

const styles = StyleSheet.create({
    toast: {
        marginTop: 100,
        alignItems: 'center',
    },
});

type Props = {
    canDownloadFiles: boolean;
    enablePublicLink: boolean;
    fileInfo: FileInfo;
}
const FileOptions = ({fileInfo, canDownloadFiles, enablePublicLink}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [action, setAction] = useState<GalleryAction>('none');

    const galleryItem = {...fileInfo, type: 'image'} as GalleryItemType;

    const handleDownload = useCallback(() => {
        setAction('downloading');
    }, []);

    const handleCopyLink = useCallback(() => {
        setAction('copying');
    }, []);

    const handlePermalink = useCallback(() => {
        showPermalink(serverUrl, '', fileInfo.post_id, intl);
    }, [serverUrl, fileInfo.post_id, intl]);

    return (
        <View>
            <Header fileInfo={fileInfo}/>
            {canDownloadFiles &&
                <OptionItem
                    action={handleDownload}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.download', defaultMessage: 'Download'})}
                    icon={'download-outline'}
                    type='default'
                />
            }
            <OptionItem
                action={handlePermalink}
                label={intl.formatMessage({id: 'screen.search.results.file_options.open_in_channel', defaultMessage: 'Open in channel'})}
                icon={'globe'}
                type='default'
            />
            {enablePublicLink &&
                <OptionItem
                    action={handleCopyLink}
                    label={intl.formatMessage({id: 'screen.search.results.file_options.copy_link', defaultMessage: 'Copy link'})}
                    icon={'link-variant'}
                    type='default'
                />
            }
            <View style={styles.toast} >
                {action === 'downloading' &&
                    <DownloadWithAction
                        action={action}
                        item={galleryItem}
                        setAction={setAction}
                    />
                }
                {action === 'copying' &&
                    <CopyPublicLink
                        item={galleryItem}
                        setAction={setAction}
                    />
                }
            </View>
        </View>
    );
};

export default FileOptions;
