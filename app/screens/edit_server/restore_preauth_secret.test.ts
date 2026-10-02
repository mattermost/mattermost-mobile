// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removePreauthSecret, setPreauthSecret} from '@init/credentials';

import {clientSecretAfterPreauthRollback, restorePreviousPreauthSecret} from './restore_preauth_secret';

jest.mock('@init/credentials', () => ({
    setPreauthSecret: jest.fn(),
    removePreauthSecret: jest.fn(),
}));

jest.mock('@utils/log', () => ({
    logWarning: jest.fn(),
}));

describe('restorePreviousPreauthSecret', () => {
    const serverUrl = 'https://example.com';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(setPreauthSecret).mockResolvedValue(true);
        jest.mocked(removePreauthSecret).mockResolvedValue(true);
    });

    it('should restore the previous secret into the keychain unchanged', async () => {
        await expect(restorePreviousPreauthSecret(serverUrl, '  old-secret  ')).resolves.toBe(true);

        expect(setPreauthSecret).toHaveBeenCalledWith(serverUrl, '  old-secret  ');
        expect(removePreauthSecret).not.toHaveBeenCalled();
    });

    it('should clear the keychain when the previous secret was empty', async () => {
        await expect(restorePreviousPreauthSecret(serverUrl, '')).resolves.toBe(true);

        expect(removePreauthSecret).toHaveBeenCalledWith(serverUrl);
        expect(setPreauthSecret).not.toHaveBeenCalled();
    });

    it('should restore whitespace-only secrets instead of clearing them', async () => {
        await expect(restorePreviousPreauthSecret(serverUrl, '   ')).resolves.toBe(true);

        expect(setPreauthSecret).toHaveBeenCalledWith(serverUrl, '   ');
        expect(removePreauthSecret).not.toHaveBeenCalled();
    });

    it('should return false when restoring a previous secret fails', async () => {
        jest.mocked(setPreauthSecret).mockResolvedValue(false);

        await expect(restorePreviousPreauthSecret(serverUrl, 'old-secret')).resolves.toBe(false);
    });

    it('should return false when clearing after an empty previous secret fails', async () => {
        jest.mocked(removePreauthSecret).mockResolvedValue(false);

        await expect(restorePreviousPreauthSecret(serverUrl, '')).resolves.toBe(false);
    });
});

describe('clientSecretAfterPreauthRollback', () => {
    it('should use the previous secret when keychain rollback succeeded', () => {
        expect(clientSecretAfterPreauthRollback(true, '  old  ', 'new', 'fallback')).toBe('  old  ');
    });

    it('should use the remaining stored secret when keychain rollback failed', () => {
        expect(clientSecretAfterPreauthRollback(false, 'old', 'new-stored', 'fallback')).toBe('new-stored');
    });

    it('should fall back when rollback failed and storage could not be read', () => {
        expect(clientSecretAfterPreauthRollback(false, 'old', undefined, 'new-fallback')).toBe('new-fallback');
    });
});
