// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SKU_SHORT_NAME} from '@constants/license';

import {getSkuDisplayName} from './subscription';

describe('getSkuDisplayName', () => {
    it('should return Enterprise Advanced for advanced SKU', () => {
        expect(getSkuDisplayName(SKU_SHORT_NAME.EnterpriseAdvanced, false)).toBe('Enterprise Advanced');
    });

    it('should return Entry for entry SKU', () => {
        expect(getSkuDisplayName(SKU_SHORT_NAME.Entry, false)).toBe('Entry');
    });

    it('should return Enterprise Advanced for empty and unknown SKUs', () => {
        expect(getSkuDisplayName('', false)).toBe('Enterprise Advanced');
        expect(getSkuDisplayName('unknown', false)).toBe('Enterprise Advanced');
    });

    it('should map legacy and standard SKUs like web', () => {
        expect(getSkuDisplayName(SKU_SHORT_NAME.E20, false)).toBe('Enterprise E20');
        expect(getSkuDisplayName(SKU_SHORT_NAME.E10, false)).toBe('Enterprise E10');
        expect(getSkuDisplayName(SKU_SHORT_NAME.Professional, false)).toBe('Professional');
        expect(getSkuDisplayName(SKU_SHORT_NAME.Starter, false)).toBe('Starter');
        expect(getSkuDisplayName(SKU_SHORT_NAME.Enterprise, false)).toBe('Enterprise');
    });

    it('should append Gov when isGovSku is true', () => {
        expect(getSkuDisplayName(SKU_SHORT_NAME.Enterprise, true)).toBe('Enterprise Gov');
        expect(getSkuDisplayName(SKU_SHORT_NAME.Entry, true)).toBe('Entry Gov');
        expect(getSkuDisplayName('', true)).toBe('Enterprise Advanced Gov');
    });
});
