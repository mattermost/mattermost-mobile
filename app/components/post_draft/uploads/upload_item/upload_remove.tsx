// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {removeDraftFile} from '@actions/local/draft';
import RemoveButton from '@components/upload_item_shared/remove_button';
import {useEditPost} from '@context/edit_post';
import {useServerUrl} from '@context/server';
import DraftEditPostUploadManager from '@managers/draft_upload_manager';

type Props = {
    channelId: string;
    rootId: string;
    clientId: string;
    fileId: string;
}

export default function UploadRemove({
    channelId,
    rootId,
    clientId,
    fileId,
}: Props) {
    const serverUrl = useServerUrl();
    const {onFileRemove, isEditMode} = useEditPost();

    const onPress = useCallback(() => {
        if (isEditMode) {
            onFileRemove?.(fileId || clientId);
            return;
        }
        DraftEditPostUploadManager.cancel(clientId);
        removeDraftFile(serverUrl, channelId, rootId, clientId);
    }, [onFileRemove, isEditMode, fileId, clientId, serverUrl, channelId, rootId]);

    return (
        <RemoveButton
            onPress={onPress}
            testID={`remove-button-${fileId}`}
        />
    );
}
