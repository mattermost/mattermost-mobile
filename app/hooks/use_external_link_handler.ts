// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {tryOpenURL} from '@utils/url';
import {onOpenLinkError} from '@utils/url/links';

export const useExternalLinkHandler = (url?: string) => {
    const intl = useIntl();

    return useCallback(() => {
        if (!url) {
            return;
        }

        const onError = () => {
            onOpenLinkError(intl);
        };

        tryOpenURL(url, onError);
    }, [intl, url]);
};

export default useExternalLinkHandler;
