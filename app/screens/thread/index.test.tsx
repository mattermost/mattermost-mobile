// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import React from 'react';
import {Text, View} from 'react-native';

import {ActionType} from '@constants';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import EphemeralStore from '@store/ephemeral_store';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Thread from './thread';

import enhanced from './index';

jest.mock('./thread', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Thread).mockImplementation(({rootId, scheduledPostCount}) => (
    <View>
        <Text testID='rootId'>{`${rootId}`}</Text>
        <Text testID='scheduledPostCount'>{`${scheduledPostCount}`}</Text>
    </View>
));

describe('screens/thread/index', () => {
    const serverUrl = 'thread.index.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        EphemeralStore.setCurrentThreadId('');
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    const seedScheduledPosts = async () => {
        const channel = TestHelper.fakeChannel({id: 'ch1', team_id: 'team1'});
        const posts = [
            TestHelper.fakeScheduledPost({id: 'post1', channel_id: 'ch1', root_id: 'thread1', error_code: '', message: 'Reply1'}),
            TestHelper.fakeScheduledPost({id: 'post2', channel_id: 'ch1', root_id: 'thread1', error_code: '', message: 'Reply2'}),
            TestHelper.fakeScheduledPost({id: 'post3', channel_id: 'ch1', root_id: 'thread2', error_code: '', message: 'Other'}),
        ];

        const models = (await Promise.all([
            operator.handleChannel({channels: [channel], prepareRecordsOnly: true}),
            operator.handleScheduledPosts({
                actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                scheduledPosts: posts,
                prepareRecordsOnly: true,
            }),
        ])).flat();
        await operator.batchRecords(models, 'test');
    };

    it('should render without a rootId, falling back instead of building a query with undefined', async () => {
        const Component = enhanced;
        const {findByTestId} = renderWithEverything(
            <Component/>,
            {database, serverUrl},
        );

        // Reaching this assertion at all is the regression: an undefined rootId
        // used to reach Q.where('root_id', undefined) and throw during subscribe.
        expect(await findByTestId('scheduledPostCount')).toHaveTextContent('0');
    });

    it('should fall back to the current thread id from EphemeralStore when rootId is missing', async () => {
        EphemeralStore.setCurrentThreadId('thread1');
        await seedScheduledPosts();

        const Component = enhanced;
        const {findByTestId} = renderWithEverything(
            <Component/>,
            {database, serverUrl},
        );

        expect(await findByTestId('rootId')).toHaveTextContent('thread1');
        expect(await findByTestId('scheduledPostCount')).toHaveTextContent('2');
    });

    it('should count only the scheduled posts belonging to the given thread', async () => {
        await seedScheduledPosts();

        const Component = enhanced;
        const {findByTestId} = renderWithEverything(
            <Component rootId='thread1'/>,
            {database, serverUrl},
        );

        expect(await findByTestId('rootId')).toHaveTextContent('thread1');
        expect(await findByTestId('scheduledPostCount')).toHaveTextContent('2');
    });
});
