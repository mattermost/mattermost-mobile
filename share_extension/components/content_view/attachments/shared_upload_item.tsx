// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import UploadItemShared from '@components/upload_item_shared';
import {sharedItemToUploadItemFile} from '@components/upload_item_shared/adapters';

import type {SharedItem} from '@mattermost/rnshare';

type Props = {
    file: SharedItem;
    fullWidth?: boolean;
    hasError?: boolean;
};

const SharedUploadItem = ({file, fullWidth = false, hasError = false}: Props) => {
    const uploadItemFile = sharedItemToUploadItemFile(file);

    return (
        <UploadItemShared
            file={uploadItemFile}
            testID={`shared_upload_item_${file.value}`}
            fullWidth={fullWidth}
            isShareExtension={true}
            hasError={hasError}
        />
    );
};

export default SharedUploadItem;
