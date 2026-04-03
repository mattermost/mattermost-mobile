// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SKU_SHORT_NAME} from '@constants/license';

/**
 * Display name for a license SKU. Mirrors webapp getSkuDisplayName (utils/subscription.ts).
 */
export function getSkuDisplayName(skuShortName: string, isGovSku: boolean): string {
    let skuName = '';
    switch (skuShortName) {
        case SKU_SHORT_NAME.E20:
            skuName = 'Enterprise E20';
            break;
        case SKU_SHORT_NAME.E10:
            skuName = 'Enterprise E10';
            break;
        case SKU_SHORT_NAME.Professional:
            skuName = 'Professional';
            break;
        case SKU_SHORT_NAME.Starter:
            skuName = 'Starter';
            break;
        case SKU_SHORT_NAME.Enterprise:
            skuName = 'Enterprise';
            break;
        case SKU_SHORT_NAME.Entry:
            skuName = 'Entry';
            break;
        default:
            skuName = 'Enterprise Advanced';
            break;
    }

    skuName += isGovSku ? ' Gov' : '';

    return skuName;
}
