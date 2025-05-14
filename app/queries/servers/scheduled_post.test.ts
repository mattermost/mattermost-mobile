// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Q, type Database} from '@nozbe/watermelondb';
import {of as of$} from 'rxjs';

import {MM_TABLES} from '@constants/database';

import {observeFirstScheduledPost, observeScheduledPostCount, observeScheduledPostCountForChannel, observeScheduledPostCountForThread, observeScheduledPostsForTeam, queryScheduledPost, queryScheduledPostsForTeam} from './scheduled_post';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

describe('Scheduled Post Queries', () => {
    let database: Database;
    let mockQuery: jest.Mock;
    let mockCollection: {query: jest.Mock};
    let mockObserveCount: jest.Mock;

    beforeEach(() => {
        mockObserveCount = jest.fn().mockReturnValue(of$(0));
        const mockQueryResult = {
            extend: jest.fn().mockReturnThis(),
            observeWithColumns: jest.fn().mockReturnValue(of$([])),
            observeCount: mockObserveCount,
            query: jest.fn().mockReturnThis(),
        };
        mockQuery = jest.fn().mockReturnValue(mockQueryResult);
        mockCollection = {query: jest.fn().mockReturnValue(mockQueryResult)};
        database = {
            get: jest.fn().mockReturnValue(mockCollection),
        } as unknown as Database;
    });

    it('should query scheduled posts for a team', () => {
        const teamId = 'team_id';
        queryScheduledPostsForTeam(database, teamId);
        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
        expect(mockCollection.query).toHaveBeenCalled();
    });

    it('should query scheduled posts for a team with direct channel posts', () => {
        const teamId = 'team_id';
        queryScheduledPostsForTeam(database, teamId, true);
        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
        expect(mockCollection.query).toHaveBeenCalledWith(
            Q.on('Channel', Q.or(
                Q.where('team_id', teamId),
                Q.where('team_id', ''),
            )),
            Q.sortBy('scheduled_at', Q.asc),
        );
    });

    it('should query scheduled post', () => {
        const channelId = 'channel_id';
        const rootId = 'root_id';
        queryScheduledPost(database, channelId, rootId);
        expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
        expect(mockCollection.query).toHaveBeenCalledWith(Q.and(
            Q.where('channel_id', channelId),
            Q.where('root_id', rootId),
        ));
    });

    describe('observeFirstScheduledPost', () => {
        it('should observe the first scheduled post', (done) => {
            const scheduledPosts = [
                {
                    id: 'scheduled_post_id',
                    observe: jest.fn().mockReturnValue(of$({id: 'scheduled_post_id'})),
                },
            ] as unknown as ScheduledPostModel[];
            observeFirstScheduledPost(scheduledPosts).subscribe((result) => {
                expect(result).toEqual({id: 'scheduled_post_id'});
                done();
            });
        });
    });

    describe('observeScheduledPostsForTeam', () => {
        it('should observe scheduled posts for a team', () => {
            const teamId = 'team_id';
            observeScheduledPostsForTeam(database, teamId);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
            expect(mockCollection.query).toHaveBeenCalledWith(
                Q.on('Channel', Q.or(Q.where('team_id', teamId))),
                Q.sortBy('scheduled_at', Q.asc),
            );
            expect(mockQuery().observeWithColumns).toHaveBeenCalledWith(['update_at', 'error_code']);
        });

        it('should observe scheduled posts for a team with direct channel posts', () => {
            const teamId = 'team_id';
            observeScheduledPostsForTeam(database, teamId, true);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
            expect(mockCollection.query).toHaveBeenCalledWith(
                Q.on('Channel', Q.or(Q.where('team_id', teamId), Q.where('team_id', ''))),
                Q.sortBy('scheduled_at', Q.asc),
            );
            expect(mockQuery().observeWithColumns).toHaveBeenCalledWith(['update_at', 'error_code']);
        });
    });

    describe('observeScheduledPostCount', () => {
        it('should observe the number of scheduled posts for a team', () => {
            const teamId = 'team_id';
            observeScheduledPostCount(database, teamId);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
            expect(mockCollection.query).toHaveBeenCalledWith(
                Q.on('Channel', Q.or(Q.where('team_id', teamId))),
                Q.sortBy('scheduled_at', Q.asc),
            );
            expect(mockObserveCount).toHaveBeenCalled();
        });

        it('should observe the number of scheduled posts for a team with direct channel posts', () => {
            const teamId = 'team_id';
            observeScheduledPostCount(database, teamId, true);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
            expect(mockCollection.query).toHaveBeenCalledWith(
                Q.on('Channel', Q.or(Q.where('team_id', teamId), Q.where('team_id', ''))),
                Q.sortBy('scheduled_at', Q.asc),
            );
            expect(mockObserveCount).toHaveBeenCalled();
        });
    });

    describe('observeScheduledPostCountForChannel', () => {
        it('should observe the number of scheduled posts for a channel', () => {
            const channelId = 'channel_id';
            observeScheduledPostCountForChannel(database, channelId, false);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
            expect(mockCollection.query).toHaveBeenCalledWith(Q.and(
                Q.where('channel_id', channelId),
                Q.where('error_code', ''),
            ));
            expect(mockObserveCount).toHaveBeenCalled();
        });

        it('should observe the number of scheduled posts for a channel with CRT', () => {
            const channelId = 'channel_id';
            observeScheduledPostCountForChannel(database, channelId, true);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
            expect(mockCollection.query).toHaveBeenCalledWith(Q.and(
                Q.where('channel_id', channelId),
                Q.where('error_code', ''),
            ));
            expect(mockQuery().extend).toHaveBeenCalledWith(Q.where('root_id', ''));
            expect(mockObserveCount).toHaveBeenCalled();
        });
    });

    describe('observeScheduledPostCountForThread', () => {
        it('should observe the number of scheduled posts for a thread', () => {
            const rootId = 'root_id';
            observeScheduledPostCountForThread(database, rootId);
            expect(database.get).toHaveBeenCalledWith(MM_TABLES.SERVER.SCHEDULED_POST);
            expect(mockCollection.query).toHaveBeenCalledWith(Q.where('root_id', rootId));
            expect(mockObserveCount).toHaveBeenCalled();
        });
    });
});
