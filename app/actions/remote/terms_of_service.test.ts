// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getCurrentUser} from '@queries/servers/user';

import {fetchTermsOfService, updateTermsOfServiceStatus} from './terms_of_service';

const serverUrl = 'terms-of-service.test.com';

const mockTerms: TermsOfService = {
    create_at: 1234567890,
    id: 'terms123',
    text: 'Test Terms of Service',
    user_id: 'user123',
};

const mockClient = {
    getTermsOfService: jest.fn(),
    updateMyTermsOfServiceStatus: jest.fn(),
} as any;

jest.mock('@queries/servers/user');

describe('terms_of_service', () => {
    beforeEach(async () => {
        NetworkManager.getClient = () => mockClient;
        await DatabaseManager.init([serverUrl]);
        jest.clearAllMocks();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('fetchTermsOfService', () => {
        it('should fetch terms of service successfully', async () => {
            mockClient.getTermsOfService.mockResolvedValueOnce(mockTerms);

            const result = await fetchTermsOfService(serverUrl);

            expect(result.terms).toBeDefined();
            expect(result.terms).toEqual(mockTerms);
            expect(mockClient.getTermsOfService).toHaveBeenCalledTimes(1);
        });

        it('should handle fetch error', async () => {
            const error = new Error('Network error');
            mockClient.getTermsOfService.mockRejectedValueOnce(error);

            const result = await fetchTermsOfService(serverUrl);

            expect(result.error).toBeDefined();
            expect(result.terms).toBeUndefined();
            expect(mockClient.getTermsOfService).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateTermsOfServiceStatus', () => {
        const mockGetCurrentUser = jest.mocked(getCurrentUser);
        const mockUser = {
            id: 'user123',
            prepareUpdate: jest.fn((fn) => fn({})),
        } as any;

        it('should update terms of service status successfully', async () => {
            mockGetCurrentUser.mockResolvedValue(mockUser);
            const termsId = 'terms123';
            const accepted = true;
            const mockResponse = {status: 'ok'};
            mockClient.updateMyTermsOfServiceStatus.mockResolvedValueOnce(mockResponse);

            const result = await updateTermsOfServiceStatus(serverUrl, termsId, accepted);

            expect(result.resp).toEqual(mockResponse);
            expect(mockClient.updateMyTermsOfServiceStatus).toHaveBeenCalledWith(termsId, accepted);
            expect(mockUser.prepareUpdate).toHaveBeenCalled();
        });

        it('should handle update error', async () => {
            const error = new Error('Network error');
            mockClient.updateMyTermsOfServiceStatus.mockRejectedValueOnce(error);

            const result = await updateTermsOfServiceStatus(serverUrl, 'terms123', true);

            expect(result.error).toBeDefined();
            expect(result.resp).toBeUndefined();
            expect(mockClient.updateMyTermsOfServiceStatus).toHaveBeenCalledTimes(1);
        });
    });
});
