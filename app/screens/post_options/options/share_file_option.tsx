// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import Share from 'react-native-share';

import {updateLocalFilePath} from '@actions/local/file';
import {downloadFile} from '@actions/remote/file';
import {BaseOption} from '@components/common_post_options';
import {useServerUrl} from '@context/server';
import {queryFilesForPost} from '@queries/servers/file';
import {getLocalFilePathFromFile} from '@utils/file';
import {pathWithPrefix} from '@utils/files';
import {logDebug} from '@utils/log';
import {getFullErrorMessage} from '@utils/errors';
import {t} from '@i18n';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    post: PostModel;
    sourceScreen: AvailableScreens;
}

const ShareFileOption = ({post}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const handleShare = useCallback(async () => {
        try {
            const files = await queryFilesForPost(post.database, post.id).fetch();
            if (!files.length) {
                return;
            }

            const filePaths: string[] = [];
            for (const file of files) {
                const fileInfo = file.toFileInfo(post.userId);
                const path = getLocalFilePathFromFile(serverUrl, fileInfo);
                if (!path) {
                    continue;
                }

                const response = await downloadFile(serverUrl, fileInfo.id!, path);
                if (response.data?.path) {
                    const filePath = response.data.path as string;
                    updateLocalFilePath(serverUrl, fileInfo.id!, filePath);
                    filePaths.push(pathWithPrefix('file://', filePath));
                }
            }

            if (filePaths.length > 0) {
                await Share.open({
                    message: '',
                    title: '',
                    urls: filePaths,
                    showAppsToView: true,
                });
            }
        } catch (error) {
            logDebug('error on share file', getFullErrorMessage(error));
        }
    }, [post, serverUrl]);

    return (
        <BaseOption
            i18nId={t('post_info.share')}
            defaultMessage='Share'
            iconName='share-variant-outline'
            onPress={handleShare}
            testID='post_options.share_file.option'
        />
    );
};

export default ShareFileOption; 