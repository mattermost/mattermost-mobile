// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import {getMyTeamById, getTeamById, getTeamSearchHistoryById, prepareDeleteTeam, removeTeamFromTeamHistory} from '@queries/servers/team';
import {logError} from '@utils/log';

import {queryTeamSearchHistoryByTeamId} from '../../queries/servers/team';

import {addSearchToTeamSearchHistory, removeSearchFromTeamSearchHistory, removeUserFromTeam, MAX_TEAM_SEARCHES} from './team';

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
        (getTeamSearchHistoryById as jest.Mock).mockResolvedValue(undefined);

        const result = await removeSearchFromTeamSearchHistory(serverUrl, searchId);

        expect(getTeamSearchHistoryById).toHaveBeenCalledWith(database, searchId);
        expect(database.write).not.toHaveBeenCalled();
        expect(result).toEqual({teamSearch: undefined});
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
        const team = {id: 'myTeamId'};
        const preparedModels = [
            {id: 'model1', _preparedState: 'markAsDeleted'},
            {id: 'model2', _preparedState: 'markAsDeleted'},
        ];
        const systemModels = [
            {id: 'systemModel1', _preparedState: 'update', value: []},
        ];

        (getMyTeamById as jest.Mock).mockResolvedValue(myTeam);
        (getTeamById as jest.Mock).mockResolvedValue(team);
        (prepareDeleteTeam as jest.Mock).mockResolvedValue(preparedModels);
        (removeTeamFromTeamHistory as jest.Mock).mockResolvedValue(systemModels);

        const result = await removeUserFromTeam(serverUrl, team.id);

        expect(getMyTeamById).toHaveBeenCalledWith(database, team.id);
        expect(getTeamById).toHaveBeenCalledWith(database, myTeam.id);
        expect(prepareDeleteTeam).toHaveBeenCalledWith(serverUrl, team);
        expect(removeTeamFromTeamHistory).toHaveBeenCalledWith(operator, team.id, true);
        expect(operator.batchRecords).toHaveBeenCalledWith(preparedModels, 'removeUserFromTeam');

        // Verify team id is not present
        systemModels.forEach((model) => {
            expect(model.value).not.toContain(team.id);
        });

        // Check if preparedModels contain systemModels
        expect(preparedModels).toEqual(expect.arrayContaining(systemModels));

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
        expect(prepareDeleteTeam).toHaveBeenCalledWith(serverUrl, team);
        expect(removeTeamFromTeamHistory).toHaveBeenCalledWith(operator, team.id, true);
        expect(operator.batchRecords).toHaveBeenCalledWith(preparedModels, 'removeUserFromTeam');
        expect(logError).toHaveBeenCalledWith('Failed removeUserFromTeam', writeError);

        // Verify team id is present
        systemModels.forEach((model) => {
            expect(model.value).toContain(team.id);
        });

        // Check if preparedModels contain systemModels
        expect(preparedModels).toEqual(expect.arrayContaining(systemModels));

        expect(result).toEqual({error: writeError});
    });

    it('should handle case when myTeam is not found', async () => {
        (getMyTeamById as jest.Mock).mockResolvedValue(null);

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(getMyTeamById).toHaveBeenCalledWith(database, teamId);
        expect(getTeamById).not.toHaveBeenCalled();
        expect(prepareDeleteTeam).not.toHaveBeenCalledWith(serverUrl, null as any);
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
        (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockImplementation(() => {
            throw error;
        });

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(DatabaseManager.getServerDatabaseAndOperator).toHaveBeenCalled();
        expect(logError).toHaveBeenCalledWith('Failed removeUserFromTeam', error);
        expect(result).toEqual({error});
    });

    it('should handle when removeTeamFromTeamHistory returns undefined or empty array', async () => {
        const myTeam = {id: 'myTeamId'};
        const team = {id: 'teamId'};
        const preparedModels = [
            {id: 'model1', _preparedState: 'markAsDeleted'},
            {id: 'model2', _preparedState: 'markAsDeleted'},
        ];

        (getMyTeamById as jest.Mock).mockResolvedValue(myTeam);
        (getTeamById as jest.Mock).mockResolvedValue(team);
        (prepareDeleteTeam as jest.Mock).mockResolvedValue(preparedModels);
        (removeTeamFromTeamHistory as jest.Mock).mockResolvedValue(undefined);

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(getMyTeamById).toHaveBeenCalledWith(database, teamId);
        expect(getTeamById).toHaveBeenCalledWith(database, myTeam.id);
        expect(prepareDeleteTeam).toHaveBeenCalledWith(serverUrl, team);
        expect(removeTeamFromTeamHistory).toHaveBeenCalledWith(operator, team.id, true);
        expect(operator.batchRecords).toHaveBeenCalledWith(preparedModels, 'removeUserFromTeam');
        expect(result).toEqual({error: undefined});
    });

    it('should handle when models length is 0', async () => {
        const myTeam = {id: 'myTeamId'};
        const team = {id: 'teamId'};
        const models: never[] = [];

        (getMyTeamById as jest.Mock).mockResolvedValue(myTeam);
        (getTeamById as jest.Mock).mockResolvedValue(team);
        (prepareDeleteTeam as jest.Mock).mockResolvedValue([]);
        (removeTeamFromTeamHistory as jest.Mock).mockResolvedValue(models);

        const result = await removeUserFromTeam(serverUrl, teamId);

        expect(getMyTeamById).toHaveBeenCalledWith(database, teamId);
        expect(getTeamById).toHaveBeenCalledWith(database, myTeam.id);
        expect(prepareDeleteTeam).toHaveBeenCalledWith(serverUrl, team);
        expect(removeTeamFromTeamHistory).toHaveBeenCalledWith(operator, team.id, true);
        expect(operator.batchRecords).not.toHaveBeenCalled();
        expect(result).toEqual({error: undefined});
    });
});

describe('addSearchToTeamSearchHistory', () => {
    const terms = 'search terms';

    beforeEach(async () => {
        jest.clearAllMocks();
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        DatabaseManager.getServerDatabaseAndOperator = jest.fn();
        (DatabaseManager.getServerDatabaseAndOperator as jest.Mock).mockReturnValue({
            database,
            operator,
        });

        operator.handleTeamSearchHistory = jest.fn();
        operator.batchRecords = jest.fn();
        jest.spyOn(Date, 'now').mockImplementation(() => 1724657520366);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should add search to team search history successfully', async () => {
        const newSearch = {
            created_at: Date.now(),
            display_term: terms,
            term: terms,
            team_id: teamId,
        };
        const searchModel = {id: 'searchModelId', _raw: {_changed: 'created_at'}};
        (operator.handleTeamSearchHistory as jest.Mock).mockResolvedValue([searchModel]);

        const result = await addSearchToTeamSearchHistory(serverUrl, teamId, terms);

        expect(operator.handleTeamSearchHistory).toHaveBeenCalledWith({
            teamSearchHistories: [newSearch],
            prepareRecordsOnly: true,
        });
        expect(operator.batchRecords).toHaveBeenCalledWith([searchModel], 'addSearchToTeamHistory');
        expect(result).toEqual({searchModel});
    });

    it('should delete the oldest entry if team search history exceeds the limit', async () => {
        const newSearch = {
            created_at: Date.now(),
            display_term: terms,
            term: terms,
            team_id: teamId,
        };
        const searchModel = {id: 'searchModelId', _raw: {_changed: ''}};
        const oldSearchModel = {id: 'oldSearchModelId', prepareDestroyPermanently: jest.fn().mockReturnValue(undefined)};
        const teamSearchHistory = new Array(MAX_TEAM_SEARCHES + 1).fill(oldSearchModel);

        (operator.handleTeamSearchHistory as jest.Mock).mockResolvedValue([searchModel]);
        (queryTeamSearchHistoryByTeamId as jest.Mock).mockReturnValue({
            fetch: jest.fn().mockResolvedValue(teamSearchHistory),
        });

        const result = await addSearchToTeamSearchHistory(serverUrl, teamId, terms);

        expect(operator.handleTeamSearchHistory).toHaveBeenCalledWith({
            teamSearchHistories: [newSearch],
            prepareRecordsOnly: true,
        });
        expect(queryTeamSearchHistoryByTeamId).toHaveBeenCalledWith(database, teamId);
        expect(oldSearchModel.prepareDestroyPermanently).toHaveBeenCalledTimes(1);
        expect(operator.batchRecords).toHaveBeenCalledWith([searchModel], 'addSearchToTeamHistory');
        expect(result).toEqual({searchModel});
    });

    it('should handle case when searchModel._raw._changed is "created_at"', async () => {
        const newSearch = {
            created_at: Date.now(),
            display_term: terms,
            term: terms,
            team_id: teamId,
        };
        const searchModel = {id: 'searchModelId', _raw: {_changed: 'created_at'}};
        (operator.handleTeamSearchHistory as jest.Mock).mockResolvedValue([searchModel]);

        const result = await addSearchToTeamSearchHistory(serverUrl, teamId, terms);

        expect(operator.handleTeamSearchHistory).toHaveBeenCalledWith({
            teamSearchHistories: [newSearch],
            prepareRecordsOnly: true,
        });
        expect(queryTeamSearchHistoryByTeamId).not.toHaveBeenCalled();
        expect(operator.batchRecords).toHaveBeenCalledWith([searchModel], 'addSearchToTeamHistory');
        expect(result).toEqual({searchModel});
    });

    it('should handle case when teamSearchHistory length is less than or equal to MAX_TEAM_SEARCHES', async () => {
        const newSearch = {
            created_at: Date.now(),
            display_term: terms,
            term: terms,
            team_id: teamId,
        };
        const searchModel = {id: 'searchModelId', _raw: {_changed: ''}};
        const oldSearchModel = {id: 'oldSearchModelId', prepareDestroyPermanently: jest.fn().mockReturnValue(undefined)};
        const teamSearchHistory = new Array(MAX_TEAM_SEARCHES).fill(searchModel);

        (operator.handleTeamSearchHistory as jest.Mock).mockResolvedValue([searchModel]);
        (queryTeamSearchHistoryByTeamId as jest.Mock).mockReturnValue({
            fetch: jest.fn().mockResolvedValue(teamSearchHistory),
        });

        const result = await addSearchToTeamSearchHistory(serverUrl, teamId, terms);

        expect(operator.handleTeamSearchHistory).toHaveBeenCalledWith({
            teamSearchHistories: [newSearch],
            prepareRecordsOnly: true,
        });
        expect(queryTeamSearchHistoryByTeamId).toHaveBeenCalledWith(database, teamId);
        expect(operator.batchRecords).toHaveBeenCalledWith([searchModel], 'addSearchToTeamHistory');
        expect(result).toEqual({searchModel});
        expect(oldSearchModel.prepareDestroyPermanently).not.toHaveBeenCalled();
    });

    it('should handle errors and log them', async () => {
        const error = new Error('Test error');
        (operator.handleTeamSearchHistory as jest.Mock).mockRejectedValue(error);

        const result = await addSearchToTeamSearchHistory(serverUrl, teamId, terms);

        expect(operator.handleTeamSearchHistory).toHaveBeenCalledWith({
            teamSearchHistories: [{created_at: expect.any(Number), display_term: terms, term: terms, team_id: teamId}],
            prepareRecordsOnly: true,
        });
        expect(logError).toHaveBeenCalledWith('Failed addSearchToTeamSearchHistory', error);
        expect(result).toEqual({error});
    });
});
