// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useRef, useState} from 'react';

import {UPLOAD_ERROR_SHOW_INTERVAL} from '@constants/files';

const useFileUploadError = () => {
    const [uploadError, setUploadError] = useState<React.ReactNode>(null);
    const uploadErrorTimeout = useRef<NodeJS.Timeout>();

    const newUploadError = useCallback((error: React.ReactNode) => {
        if (uploadErrorTimeout.current) {
            clearTimeout(uploadErrorTimeout.current);
        }
        setUploadError(error);

        uploadErrorTimeout.current = setTimeout(() => {
            setUploadError(null);
        }, UPLOAD_ERROR_SHOW_INTERVAL);
    }, []);

    return {
        uploadError,
        newUploadError,
    };
};

export default useFileUploadError;
