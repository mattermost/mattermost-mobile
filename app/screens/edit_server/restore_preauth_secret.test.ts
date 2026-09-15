// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {removePreauthSecret, setPreauthSecret} from '@init/credentials';

import {restorePreviousPreauthSecret} from './restore_preauth_secret';

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

    it('should restore a non-empty previous secret into the keychain', async () => {
        await expect(restorePreviousPreauthSecret(serverUrl, '  old-secret  ')).resolves.toBe(true);

        expect(setPreauthSecret).toHaveBeenCalledWith(serverUrl, 'old-secret');
        expect(removePreauthSecret).not.toHaveBeenCalled();
    });

    it('should clear the keychain when the previous secret was empty', async () => {
        await expect(restorePreviousPreauthSecret(serverUrl, '   ')).resolves.toBe(true);

        expect(removePreauthSecret).toHaveBeenCalledWith(serverUrl);
        expect(setPreauthSecret).not.toHaveBeenCalled();
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
