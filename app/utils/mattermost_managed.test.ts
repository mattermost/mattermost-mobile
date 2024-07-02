// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import {Platform} from 'react-native';

import {
    getIOSAppGroupDetails,
    deleteIOSDatabase,
    renameIOSDatabase,
    deleteEntitiesFile,
} from './mattermost_managed';

jest.mock('@mattermost/rnutils', () => ({
    getConstants: jest.fn(),
    deleteDatabaseDirectory: jest.fn(),
    renameDatabase: jest.fn(),
    deleteEntitiesFile: jest.fn(),
}));

describe('iOS Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getIOSAppGroupDetails', () => {
        test('retrieves iOS AppGroup details correctly', () => {
            const constantsMock = {
                appGroupIdentifier: 'group.com.example.app',
                appGroupSharedDirectory: {sharedDirectory: '/shared', databasePath: '/shared/database'},
            };

            //@ts-expect-error mockReturnValue
            RNUtils.getConstants.mockReturnValue(constantsMock);

            const details = getIOSAppGroupDetails();

            expect(details).toEqual({
                appGroupIdentifier: 'group.com.example.app',
                appGroupSharedDirectory: '/shared',
                appGroupDatabase: '/shared/database',
            });
            expect(RNUtils.getConstants).toHaveBeenCalled();
        });
    });

    describe('deleteIOSDatabase', () => {
        test('deletes iOS database with given parameters', async () => {
            //@ts-expect-error mockReturnValue
            const deleteMock = RNUtils.deleteDatabaseDirectory.mockResolvedValue(true);

            const result = await deleteIOSDatabase({databaseName: 'test.db', shouldRemoveDirectory: true});

            expect(deleteMock).toHaveBeenCalledWith('test.db', true);
            expect(result).toBe(true);
        });

        test('deletes iOS database with default parameters', async () => {
            //@ts-expect-error mockReturnValue
            const deleteMock = RNUtils.deleteDatabaseDirectory.mockResolvedValue(true);

            const result = await deleteIOSDatabase({});

            expect(deleteMock).toHaveBeenCalledWith('', false);
            expect(result).toBe(true);
        });
    });

    describe('renameIOSDatabase', () => {
        test('renames iOS database with given parameters', () => {
            //@ts-expect-error mockReturnValue
            const renameMock = RNUtils.renameDatabase.mockResolvedValue(true);

            const result = renameIOSDatabase('old.db', 'new.db');

            expect(renameMock).toHaveBeenCalledWith('old.db', 'new.db');
            expect(result).resolves.toBe(true);
        });
    });

    describe('deleteEntitiesFile', () => {
        test('deletes entities file on iOS', () => {
            Platform.OS = 'ios';

            //@ts-expect-error mockReturnValue
            const deleteMock = RNUtils.deleteEntitiesFile.mockResolvedValue(true);

            const result = deleteEntitiesFile();

            expect(deleteMock).toHaveBeenCalled();
            expect(result).resolves.toBe(true);
        });

        test('resolves true on non-iOS platforms', () => {
            Platform.OS = 'android';

            const result = deleteEntitiesFile();

            expect(result).resolves.toBe(true);
        });
    });
});
