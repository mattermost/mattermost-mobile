// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeepLink} from '@constants';
import DatabaseManager from '@database/manager';
import {getCurrentTeam} from '@queries/servers/team';
import {displayPermalink} from '@utils/permalink';

import {showPermalink} from './permalink';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('@database/manager');
jest.mock('@queries/servers/team');
jest.mock('@utils/permalink');

const serverUrl = 'https://example.com';
const teamName = 'team-name';
const postId = 'post-id';
const openAsPermalink = true;

describe('showPermalink', () => {
    describe('showPermalink', () => {
        const mockGetServerDatabaseAndOperator = {
            database: {} as Database,
            operator: {} as ServerDataOperator,
        };
        it('should return an empty object on success when teamName is provided', async () => {
            jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue(mockGetServerDatabaseAndOperator);

            const result = await showPermalink(serverUrl, teamName, postId);

            expect(result).toEqual({});
            expect(displayPermalink).toHaveBeenCalledWith(teamName, postId, openAsPermalink);
        });

        const teamNames = ['', DeepLink.Redirect];

        it.each(teamNames)('should return an empty object on success when teamName is not provided and invoke getCurrentTeam. teamName = \'%s\'', async (tName) => {
            const resultTeam = {name: 'team-name'};
            jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockReturnValue(mockGetServerDatabaseAndOperator);
            (getCurrentTeam as jest.Mock).mockResolvedValue(resultTeam);

            const result = await showPermalink(serverUrl, tName, postId);

            expect(result).toEqual({});
            expect(getCurrentTeam).toHaveBeenCalledWith(mockGetServerDatabaseAndOperator.database);
            expect(displayPermalink).toHaveBeenCalledWith(resultTeam.name, postId, openAsPermalink);
        });

        it('should return an object with error property on failure', async () => {
            jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementation(() => {
                throw new Error('Database error');
            });

            const result = await showPermalink(serverUrl, teamName, postId);

            expect(result).toHaveProperty('error');
        });
    });
});

