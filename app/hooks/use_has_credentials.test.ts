// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {waitFor} from '@testing-library/react-native';

import {getAllServerCredentials} from '@init/credentials';

import {useHasCredentials} from './use_has_credentials';

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
        rerender();
        rerender();

        // Should still only have called once
        expect(mockGetAllServerCredentials).toHaveBeenCalledTimes(1);
    });
});
