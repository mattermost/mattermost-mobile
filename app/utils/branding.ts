// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applicationId} from 'expo-application';

export const ENCMA_APPLICATION_ID = 'com.encma.hxmain';
export const ENCMA_PRODUCT_NAME = 'ENCMA';

export const isEncmaApp = applicationId === ENCMA_APPLICATION_ID;

/**
 * Preserve an administrator's custom site name, but use ENCMA instead of the
 * upstream product fallback when no distinct site name has been configured.
 */
export const getDisplayProductName = (siteName?: string) => {
    if (isEncmaApp && (!siteName || siteName.trim().toLowerCase() === 'mattermost')) {
        return ENCMA_PRODUCT_NAME;
    }

    return siteName || 'Mattermost';
};
