// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

describe('TeamLoadStore', () => {

    afterEach(() => {
        jest.resetModules();
    });

    describe('getLoadingTeamChannelsSubject', () => {
        it('should return the initial value for loading team channels', () => {
            const server = 'localhost';

            const {getLoadingTeamChannelsSubject} = require('./team_load_store');

            expect(getLoadingTeamChannelsSubject(server).value).toEqual(0);
        });
    });

    describe('setTeamLoading', () => {
        it('should modify loading count for a team channel according to its serverUrl', () => {
            const {getLoadingTeamChannelsSubject, setTeamLoading} = require('./team_load_store');

            const totalCount = 5;
            const serverUrl = 'http://my-mattermost.com';
            for (let i = 0; i < totalCount; i++) {
                setTeamLoading(serverUrl, true);
            }

            expect(getLoadingTeamChannelsSubject(serverUrl).value).toEqual(totalCount);
        });
    });
});
