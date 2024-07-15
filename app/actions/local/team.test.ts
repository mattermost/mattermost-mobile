// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import ServerDataOperator from '@app/database/operator/server_data_operator';
import DatabaseManager from '@database/manager';
import {getMyTeamById, getTeamById, getTeamSearchHistoryById, prepareDeleteTeam, removeTeamFromTeamHistory} from '@queries/servers/team';
import {logError} from '@utils/log';

import {removeSearchFromTeamSearchHistory, removeUserFromTeam} from './team';

jest.mock('@database/manager');
jest.mock('@queries/servers/team');
jest.mock('@utils/log');

let operator: ServerDataOperator;
const serverUrl = 'baseHandler.test.com';
const teamId = 'teamId123';
const database = {
    write: jest.fn(async (callback) => callback()),
};

describe('removeSearchFromTeamSearchHistory', () => {
    const searchId = 'searchId123';

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        DatabaseManager.getServerDatabaseAndOperator = jest.fn();
        (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockReturnValue({
            database,
            operator,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should remove search from team search history successfully', async () => {
        const teamSearch = {
            destroyPermanently: jest.fn(),
        };
        (getTeamSearchHistoryById as jest.Mock).mockResolvedValue(teamSearch);

        const result = await removeSearchFromTeamSearchHistory(serverUrl, searchId);

        expect(getTeamSearchHistoryById).toHaveBeenCalledWith(database, searchId);
        expect(database.write).toHaveBeenCalledWith(expect.any(Function));
        expect(database.write).toHaveBeenCalledTimes(1);
        expect(teamSearch.destroyPermanently).toHaveBeenCalledTimes(1);
        expect(result).toEqual({teamSearch});
    });

    it('should handle case when team search history is not found', async () => {
        (getTeamSearchHistoryById as jest.Mock).mockResolvedValue(null);

        const result = await removeSearchFromTeamSearchHistory(serverUrl, searchId);

        expect(getTeamSearchHistoryById).toHaveBeenCalledWith(database, searchId);
        expect(database.write).not.toHaveBeenCalled();
        expect(result).toEqual({teamSearch: null});
    });

    it('should handle errors and log them', async () => {
        const error = new Error('Test error');
        (getTeamSearchHistoryById as jest.Mock).mockRejectedValue(error);

        const result = await removeSearchFromTeamSearchHistory(serverUrl, searchId);

        expect(getTeamSearchHistoryById).toHaveBeenCalledWith(database, searchId);
        expect(logError).toHaveBeenCalledWith('Failed removeSearchFromTeamSearchHistory', error);
        expect(result).toEqual({error});
    });

    it('should handle database write errors', async () => {
        const teamSearch = {
            destroyPermanently: jest.fn(),
        };
        const writeError = new Error('Database write error');
        (getTeamSearchHistoryById as jest.Mock).mockResolvedValue(teamSearch);
        (database.write as jest.Mock).mockRejectedValue(writeError);

        const result = await removeSearchFromTeamSearchHistory(serverUrl, searchId);

        expect(getTeamSearchHistoryById).toHaveBeenCalledWith(database, searchId);
        expect(database.write).toHaveBeenCalledWith(expect.any(Function));
        expect(logError).toHaveBeenCalledWith('Failed removeSearchFromTeamSearchHistory', writeError);
        expect(result).toEqual({error: writeError});
    });
});

describe('removeUserFromTeam', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        DatabaseManager.getServerDatabaseAndOperator = jest.fn();
        (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockReturnValue({
            database,
            operator,
        });

        operator.batchRecords = jest.fn();
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should remove user from team successfully', async () => {
        const myTeam = {id: 'myTeamId'};
        const team = {id: 'teamId'};
        const preparedModels = [
            {id: 'model1', _preparedState: 'markAsDeleted'},
            {id: 'model2', _preparedState: 'markAsDeleted'},
        ];
        const systemModels = [
            {id: 'systemModel1', _preparedState: 'update', value: [team.id]},
        ];

        (getMyTeamById as jest.Mock).mockResolvedValue(myTeam);
        (getTeamById as jest.Mock).mockResolvedValue(team);
        (prepareDeleteTeam as jest.Mock).mockResolvedValue(preparedModels);
        (removeTeamFromTeamHistory as jest.Mock).mockResolvedValue(systemModels);

        const result = await removeUserFromTeam(serverUrl, team.id);

        expect(getMyTeamById).toHaveBeenCalledWith(database, team.id);
        expect(getTeamById).toHaveBeenCalledWith(database, myTeam.id);
        expect(prepareDeleteTeam).toHaveBeenCalledWith(team);
        expect(removeTeamFromTeamHistory).toHaveBeenCalledWith(operator, team.id, true);
        expect(operator.batchRecords).toHaveBeenCalledWith([...preparedModels], 'removeUserFromTeam');

        // Verify team id is present
        systemModels.forEach((model) => {
            expect(model.value).toContain(team.id);
        });

        expect(result).toEqual({error: undefined});
    });

    it('should handle errors during database write', async () => {
        const myTeam = {id: 'myTeamId'};
        const team = {id: 'teamId'};
        const preparedModels = [
            {id: 'model1', _preparedState: 'markAsDeleted'},
            {id: 'model2', _preparedState: 'markAsDeleted'},
        ];
        const systemModels = [
            {id: 'systemModel1', _preparedState: 'update', value: [team.id]},
        ];
        const writeError = new Error('Database write error');

        (getMyTeamById as jest.Mock).mockResolvedValue(myTeam);
        (getTeamById as jest.Mock).mockResolvedValue(team);
        (prepareDeleteTeam as jest.Mock).mockResolvedValue(preparedModels);
        (removeTeamFromTeamHistory as jest.Mock).mockResolvedValue(systemModels);
        (operator.batchRecords as jest.Mock).mockRejectedValue(writeError);

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(getMyTeamById).toHaveBeenCalledWith(database, teamId);
        expect(getTeamById).toHaveBeenCalledWith(database, myTeam.id);
        expect(prepareDeleteTeam).toHaveBeenCalledWith(team);
        expect(removeTeamFromTeamHistory).toHaveBeenCalledWith(operator, team.id, true);
        expect(operator.batchRecords).toHaveBeenCalledWith([...preparedModels], 'removeUserFromTeam');
        expect(logError).toHaveBeenCalledWith('Failed removeUserFromTeam', writeError);

        // Verify team id is present
        systemModels.forEach((model) => {
            expect(model.value).toContain(team.id);
        });

        expect(result).toEqual({error: writeError});
    });

    it('should handle case when myTeam is not found', async () => {
        (getMyTeamById as jest.Mock).mockResolvedValue(null);

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(getMyTeamById).toHaveBeenCalledWith(database, teamId);
        expect(getTeamById).not.toHaveBeenCalled();
        expect(prepareDeleteTeam).not.toHaveBeenCalled();
        expect(removeTeamFromTeamHistory).not.toHaveBeenCalled();
        expect(operator.batchRecords).not.toHaveBeenCalled();
        expect(result).toEqual({error: undefined});
    });

    it('should handle case when team is not found', async () => {
        const myTeam = {id: 'myTeamId'};

        (getMyTeamById as jest.Mock).mockResolvedValue(myTeam);
        (getTeamById as jest.Mock).mockResolvedValue(null);

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(getMyTeamById).toHaveBeenCalledWith(database, teamId);
        expect(getTeamById).toHaveBeenCalledWith(database, myTeam.id);
        expect(result.error).toEqual(new Error('Team not found'));
    });

    it('should handle errors and log them', async () => {
        const error = new Error('Test error');
        (getMyTeamById as jest.Mock).mockRejectedValue(error);

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(getMyTeamById).toHaveBeenCalledWith(database, teamId);
        expect(logError).toHaveBeenCalledWith('Failed removeUserFromTeam', error);
        expect(result).toEqual({error});
    });
});
