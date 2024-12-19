// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forwardRef, useImperativeHandle, type ReactNode, useCallback} from 'react';
import {useIntl} from 'react-intl';

import {alertDownloadDocumentDisabled} from '@utils/document';

export type DocumentRef = {
    handlePreviewPress: () => void;
}

type DocumentProps = {
    canDownloadFiles: boolean;
    file: FileInfo;
    children: ReactNode;
    downloadAndPreviewFile: (file: FileInfo) => void;
}

const Document = forwardRef<DocumentRef, DocumentProps>(({canDownloadFiles, children, downloadAndPreviewFile, file}: DocumentProps, ref) => {
    const intl = useIntl();

    const handlePreviewPress = useCallback(async () => {
        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        downloadAndPreviewFile(file);
    }, [canDownloadFiles, downloadAndPreviewFile, intl, file]);

    useImperativeHandle(ref, () => ({
        handlePreviewPress,
    }), [handlePreviewPress]);

    return children;
});

Document.displayName = 'Document';

export default Document;
