// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isAnalysisLicensed} from './license';

describe('isAnalysisLicensed', () => {
    const makeLicense = (overrides: Partial<ClientLicense>): ClientLicense => ({
        SkuShortName: '',
        MessageExport: 'false',
        ...overrides,
    } as ClientLicense);

    it('should pass enterprise-tier SKUs', () => {
        expect(isAnalysisLicensed(makeLicense({SkuShortName: 'enterprise'}))).toBe(true);
        expect(isAnalysisLicensed(makeLicense({SkuShortName: 'advanced'}))).toBe(true);
        expect(isAnalysisLicensed(makeLicense({SkuShortName: 'entry'}))).toBe(true);
    });

    it('should reject professional and missing licenses', () => {
        expect(isAnalysisLicensed(makeLicense({SkuShortName: 'professional'}))).toBe(false);
        expect(isAnalysisLicensed(undefined)).toBe(false);
    });

    it('should fall back to the MessageExport feature flag for unknown SKUs', () => {
        expect(isAnalysisLicensed(makeLicense({SkuShortName: 'E20', MessageExport: 'true'}))).toBe(true);
        expect(isAnalysisLicensed(makeLicense({SkuShortName: 'E10', MessageExport: 'false'}))).toBe(false);
    });
});
