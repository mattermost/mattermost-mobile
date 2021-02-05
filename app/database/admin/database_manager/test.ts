// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import DatabaseManager from './index';

jest.mock('./index');

describe('*** Database Manager tests ***', () => {
    it('should return a default database', async () => {
        const defaultDB = await DatabaseManager.getDefaultDatabase();
        console.log(defaultDB);
        expect(defaultDB).toBeTruthy();

        // expect(defaultDB).toBeInstanceOf(Database);
    });
});
