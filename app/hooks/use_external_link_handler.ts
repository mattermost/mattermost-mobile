// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {useServerUrl} from '@context/server';
import {openLink} from '@utils/url/links';

export const useExternalLinkHandler = (url?: string, siteURL?: string) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    return useCallback(() => {
        if (!url || !serverUrl) {
            return;
        }

        openLink(url, serverUrl, siteURL || '', intl);
    }, [intl, url, serverUrl, siteURL]);
};

export default useExternalLinkHandler;
