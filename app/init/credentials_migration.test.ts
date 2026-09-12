// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storePreauthSecretMigrationDone} from '@actions/app/global';
import {getLegacyPreauthSecret, getPreauthSecret, removeLegacyPreauthSecret, setPreauthSecret} from '@init/credentials';
import {getPreauthSecretMigrationDone} from '@queries/app/global';

import {migrateLegacyPreauthSecret} from './credentials_migration';

jest.mock('@actions/app/global');
jest.mock('@queries/app/global');
jest.mock('@init/credentials');

describe('migrateLegacyPreauthSecret', () => {
    const activeUrl = 'https://active.com';
    const otherUrl = 'https://other.com';
    const legacySecret = 'secret-a';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(getPreauthSecretMigrationDone).mockResolvedValue(false);
        jest.mocked(getLegacyPreauthSecret).mockResolvedValue(legacySecret);
        jest.mocked(getPreauthSecret).mockResolvedValue(undefined);
        jest.mocked(setPreauthSecret).mockResolvedValue(true);
    });

    it('should adopt the legacy secret when a single server owns it', async () => {
        await migrateLegacyPreauthSecret([activeUrl]);

        expect(setPreauthSecret).toHaveBeenCalledTimes(1);
        expect(setPreauthSecret).toHaveBeenCalledWith(activeUrl, legacySecret);
        expect(removeLegacyPreauthSecret).toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).toHaveBeenCalled();
    });

    it('should discard the secret rather than guess an owner with several servers', async () => {
        await migrateLegacyPreauthSecret([activeUrl, otherUrl]);

        expect(setPreauthSecret).not.toHaveBeenCalled();
        expect(removeLegacyPreauthSecret).toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).toHaveBeenCalled();
    });

    it('should do nothing when the migration already ran', async () => {
        jest.mocked(getPreauthSecretMigrationDone).mockResolvedValue(true);

        await migrateLegacyPreauthSecret([activeUrl]);

        expect(getLegacyPreauthSecret).not.toHaveBeenCalled();
        expect(setPreauthSecret).not.toHaveBeenCalled();
        expect(removeLegacyPreauthSecret).not.toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).not.toHaveBeenCalled();
    });

    it('should mark the migration done when there is no legacy entry', async () => {
        jest.mocked(getLegacyPreauthSecret).mockResolvedValue(undefined);

        await migrateLegacyPreauthSecret([activeUrl]);

        expect(setPreauthSecret).not.toHaveBeenCalled();
        expect(removeLegacyPreauthSecret).not.toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).toHaveBeenCalled();
    });

    it('should not mark the migration done when the legacy read fails', async () => {
        jest.mocked(getLegacyPreauthSecret).mockRejectedValue(new Error('Keystore error'));

        await expect(migrateLegacyPreauthSecret([activeUrl])).resolves.not.toThrow();

        expect(setPreauthSecret).not.toHaveBeenCalled();
        expect(removeLegacyPreauthSecret).not.toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).not.toHaveBeenCalled();
    });

    it('should defer without deleting when there is no active server', async () => {
        await migrateLegacyPreauthSecret([]);

        expect(setPreauthSecret).not.toHaveBeenCalled();
        expect(removeLegacyPreauthSecret).not.toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).not.toHaveBeenCalled();
    });

    it('should not overwrite a secret the target server already has', async () => {
        jest.mocked(getPreauthSecret).mockResolvedValue('secret-b');

        await migrateLegacyPreauthSecret([activeUrl]);

        expect(setPreauthSecret).not.toHaveBeenCalled();
        expect(removeLegacyPreauthSecret).toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).toHaveBeenCalled();
    });

    it('should keep the legacy entry and retry later when the write is not stored', async () => {
        jest.mocked(setPreauthSecret).mockResolvedValue(false);

        await migrateLegacyPreauthSecret([activeUrl]);

        expect(removeLegacyPreauthSecret).not.toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).not.toHaveBeenCalled();
    });

    it('should keep the legacy entry and retry later when the write throws', async () => {
        jest.mocked(setPreauthSecret).mockRejectedValue(new Error('Keystore error'));

        await expect(migrateLegacyPreauthSecret([activeUrl])).resolves.not.toThrow();

        expect(removeLegacyPreauthSecret).not.toHaveBeenCalled();
        expect(storePreauthSecretMigrationDone).not.toHaveBeenCalled();
    });

    it('should not mark the migration done when the legacy delete fails', async () => {
        jest.mocked(removeLegacyPreauthSecret).mockRejectedValue(new Error('Keystore error'));

        await expect(migrateLegacyPreauthSecret([activeUrl])).resolves.not.toThrow();

        expect(storePreauthSecretMigrationDone).not.toHaveBeenCalled();
    });

    it('should not throw when the flag write fails', async () => {
        jest.mocked(storePreauthSecretMigrationDone).mockRejectedValue(new Error('DB error'));

        await expect(migrateLegacyPreauthSecret([activeUrl])).resolves.not.toThrow();
    });

    it('should be idempotent once the legacy entry is gone', async () => {
        await migrateLegacyPreauthSecret([activeUrl]);

        jest.mocked(getLegacyPreauthSecret).mockResolvedValue(undefined);
        await migrateLegacyPreauthSecret([activeUrl]);

        expect(setPreauthSecret).toHaveBeenCalledTimes(1);
    });
});
