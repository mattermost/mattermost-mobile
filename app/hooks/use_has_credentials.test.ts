// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, waitFor} from '@testing-library/react-native';

import DatabaseManager from '@database/manager';
import {useHasCredentials} from '@hooks/use_has_credentials';
import {getAllServerCredentials} from '@init/credentials';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@database/manager', () => ({
    getActiveServerDatabase: jest.fn(),
    getActiveServerUrl: jest.fn(),
}));
jest.mock('@init/credentials');

const mockGetAllServerCredentials = jest.mocked(getAllServerCredentials);

describe('useHasCredentials', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return null initially before credentials are loaded', () => {
        mockGetAllServerCredentials.mockImplementation(() => new Promise(() => {})); // Never resolves

        const {result} = renderHook(() => useHasCredentials());

        expect(result.current).toBeNull();
    });

    it('should return true when credentials exist', async () => {
        mockGetAllServerCredentials.mockResolvedValue([
            {
                serverUrl: 'https://server1.com',
                userId: 'user1',
                token: 'token1',
            },
        ]);

        const {result} = renderHook(() => useHasCredentials());

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        expect(mockGetAllServerCredentials).toHaveBeenCalledTimes(1);
    });

    it('should return false when no credentials exist', async () => {
        mockGetAllServerCredentials.mockResolvedValue([]);

        const {result} = renderHook(() => useHasCredentials());

        await waitFor(() => {
            expect(result.current).toBe(false);
        });

        expect(mockGetAllServerCredentials).toHaveBeenCalledTimes(1);
    });

    it('should return true when multiple credentials exist', async () => {
        mockGetAllServerCredentials.mockResolvedValue([
            {
                serverUrl: 'https://server1.com',
                userId: 'user1',
                token: 'token1',
            },
            {
                serverUrl: 'https://server2.com',
                userId: 'user2',
                token: 'token2',
            },
        ]);

        const {result} = renderHook(() => useHasCredentials());

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        expect(mockGetAllServerCredentials).toHaveBeenCalledTimes(1);
    });

    it('should not redirect to authenticated when the active session database is missing', async () => {
        mockGetAllServerCredentials.mockResolvedValue([
            {
                serverUrl: 'https://server1.com',
                userId: 'user1',
                token: 'token1',
            },
        ]);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('https://server1.com');
        jest.mocked(DatabaseManager.getActiveServerDatabase).mockResolvedValue(undefined);

        const {result} = renderHook(() => useHasCredentials(true));

        await waitFor(() => {
            expect(result.current).toBe(false);
        });
    });

    it('should allow authenticated redirect only with matching credentials and a database', async () => {
        mockGetAllServerCredentials.mockResolvedValue([
            {
                serverUrl: 'https://server1.com',
                userId: 'user1',
                token: 'token1',
            },
        ]);
        jest.mocked(DatabaseManager.getActiveServerUrl).mockResolvedValue('https://server1.com');
        jest.mocked(DatabaseManager.getActiveServerDatabase).mockResolvedValue({} as Database);

        const {result} = renderHook(() => useHasCredentials(true));

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });

    it('should only check credentials once on mount', async () => {
        mockGetAllServerCredentials.mockResolvedValue([
            {
                serverUrl: 'https://server1.com',
                userId: 'user1',
                token: 'token1',
            },
        ]);

        const {result, rerender} = renderHook(() => useHasCredentials());

        await waitFor(() => {
            expect(result.current).toBe(true);
        });

        // Re-render the hook
        rerender(undefined);
        rerender(undefined);

        // Should still only have called once
        expect(mockGetAllServerCredentials).toHaveBeenCalledTimes(1);
    });
});
