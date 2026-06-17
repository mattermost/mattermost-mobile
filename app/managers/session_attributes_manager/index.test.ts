// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import base64 from 'base-64';

import {License} from '@constants';
import {getConfig, getLicense} from '@queries/servers/system';
import {advanceTimers, enableFakeTimers} from '@test/timer_helpers';

import sessionAttributeCollector from './collector';

import SessionAttributesManager from './index';

const mockGetClient = jest.fn();
const mockCreateClient = jest.fn();

jest.mock('@managers/network_manager', () => ({
    __esModule: true,
    default: {
        getClient: (...args: unknown[]) => mockGetClient(...args),
        createClient: (...args: unknown[]) => mockCreateClient(...args),
    },
}));

jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        serverDatabases: {
            'https://chat.example.com': {database: {}},
        },
    },
}));

jest.mock('@queries/servers/system', () => ({
    getConfig: jest.fn(),
    getLicense: jest.fn(),
}));

jest.mock('./collector', () => ({
    __esModule: true,
    default: {
        getOSPlatform: jest.fn().mockReturnValue('ios'),
        getOSVersion: jest.fn().mockReturnValue('17.0'),
    },
}));

const serverUrl = 'https://chat.example.com';
const manifest: SAField[] = [
    {
        name: 'os_platform',
        type: 'string',
        ttl_seconds: 0,
        grace_period_seconds: 0,
    },
    {
        name: 'os_version',
        type: 'string',
        ttl_seconds: 15,
        grace_period_seconds: 30,
    },
];

describe('SessionAttributesManager', () => {
    let mockClient: {
        getSessionAttributesManifest: jest.Mock;
    };

    beforeEach(() => {
        jest.clearAllMocks();
        enableFakeTimers();
        jest.mocked(sessionAttributeCollector.getOSPlatform).mockReturnValue('ios');
        jest.mocked(sessionAttributeCollector.getOSVersion).mockReturnValue('17.0');
        jest.mocked(getConfig).mockResolvedValue({FeatureFlagSessionAttributes: 'true'} as ClientConfig);
        jest.mocked(getLicense).mockResolvedValue({IsLicensed: 'true', SkuShortName: License.SKU_SHORT_NAME.EnterpriseAdvanced} as ClientLicense);

        mockClient = {
            getSessionAttributesManifest: jest.fn().mockResolvedValue(manifest),
        };

        mockGetClient.mockReturnValue(mockClient);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should collect attributes lazily when building the first outbound header', async () => {
        await SessionAttributesManager.refreshManifest(serverUrl);

        const header = await SessionAttributesManager.getOutboundHeader(serverUrl);
        expect(JSON.parse(base64.decode(header!))).toEqual({
            os_platform: 'ios',
            os_version: '17.0',
        });
        expect(sessionAttributeCollector.getOSPlatform).toHaveBeenCalled();
    });

    it('should always resend ttl=0 attributes and gate ttl>0 attributes by TTL', async () => {
        await SessionAttributesManager.refreshManifest(serverUrl);

        const first = await SessionAttributesManager.getOutboundHeader(serverUrl);
        expect(JSON.parse(base64.decode(first!))).toEqual({
            os_platform: 'ios',
            os_version: '17.0',
        });

        // os_platform (ttl=0) always resends; os_version (ttl=15) is still fresh
        const second = await SessionAttributesManager.getOutboundHeader(serverUrl);
        expect(JSON.parse(base64.decode(second!))).toEqual({
            os_platform: 'ios',
        });

        await advanceTimers(16_000);

        const third = await SessionAttributesManager.getOutboundHeader(serverUrl);
        expect(JSON.parse(base64.decode(third!))).toEqual({
            os_platform: 'ios',
            os_version: '17.0',
        });
    });

    it('should resend attributes after manifest invalidation', async () => {
        await SessionAttributesManager.refreshManifest(serverUrl);
        await SessionAttributesManager.getOutboundHeader(serverUrl);

        jest.mocked(sessionAttributeCollector.getOSVersion).mockReturnValue('18.0');

        await SessionAttributesManager.refreshManifest(serverUrl);

        const header = await SessionAttributesManager.getOutboundHeader(serverUrl);
        expect(JSON.parse(base64.decode(header!))).toEqual({
            os_platform: 'ios',
            os_version: '18.0',
        });
    });

    it('should stay dormant when manifest is empty', async () => {
        mockClient.getSessionAttributesManifest.mockResolvedValue([]);

        await SessionAttributesManager.refreshManifest(serverUrl);

        await expect(SessionAttributesManager.getOutboundHeader(serverUrl)).resolves.toBeUndefined();
    });

    it('should stay dormant and skip the request when the feature flag is disabled', async () => {
        jest.mocked(getConfig).mockResolvedValue({FeatureFlagSessionAttributes: 'false'} as ClientConfig);

        await SessionAttributesManager.refreshManifest(serverUrl);

        expect(mockClient.getSessionAttributesManifest).not.toHaveBeenCalled();
        await expect(SessionAttributesManager.getOutboundHeader(serverUrl)).resolves.toBeUndefined();
    });

    it('should stay dormant and skip the request when the license is insufficient', async () => {
        jest.mocked(getLicense).mockResolvedValue({IsLicensed: 'false'} as ClientLicense);

        await SessionAttributesManager.refreshManifest(serverUrl);

        expect(mockClient.getSessionAttributesManifest).not.toHaveBeenCalled();
        await expect(SessionAttributesManager.getOutboundHeader(serverUrl)).resolves.toBeUndefined();
    });

    it('should omit empty attribute values from the header payload', async () => {
        jest.mocked(sessionAttributeCollector.getOSVersion).mockReturnValue('');

        await SessionAttributesManager.refreshManifest(serverUrl);

        const header = await SessionAttributesManager.getOutboundHeader(serverUrl);
        expect(JSON.parse(base64.decode(header!))).toEqual({os_platform: 'ios'});
    });

    it('should not collect attributes while fetching the manifest', async () => {
        await SessionAttributesManager.refreshManifest(serverUrl);

        expect(sessionAttributeCollector.getOSPlatform).not.toHaveBeenCalled();
        expect(sessionAttributeCollector.getOSVersion).not.toHaveBeenCalled();
    });

    it('should refetch manifest when refreshManifest is called again', async () => {
        await SessionAttributesManager.refreshManifest(serverUrl);
        mockClient.getSessionAttributesManifest.mockClear();

        await SessionAttributesManager.refreshManifest(serverUrl);

        expect(mockClient.getSessionAttributesManifest).toHaveBeenCalled();
    });

    it('should remove server state when removeServer is called', async () => {
        await SessionAttributesManager.refreshManifest(serverUrl);

        SessionAttributesManager.removeServer(serverUrl);

        await expect(SessionAttributesManager.getOutboundHeader(serverUrl)).resolves.toBeUndefined();
    });
});
