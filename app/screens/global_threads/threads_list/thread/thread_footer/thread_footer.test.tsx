// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import UserAvatarsStack from '@components/user_avatars_stack';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ThreadFooter from './thread_footer';

import type {Database} from '@nozbe/watermelondb';
import type ThreadModel from '@typings/database/models/servers/thread';

const serverUrl = 'some.server.url';

jest.mock('@components/user_avatars_stack');
jest.mocked(UserAvatarsStack).mockImplementation((props) => {
    return React.createElement('UserAvatarsStack', {...props, testID: 'user-avatars-stack'});
});

describe('ThreadFooter', () => {
    let database: Database;
    let operator: ServerDataOperator;

    async function getBaseProps(): Promise<ComponentProps<typeof ThreadFooter>> {
        const userModels = await operator.handleUsers({
            users: [
                TestHelper.fakeUser({
                    id: 'user-1',
                    username: 'user-1',
                }),
                TestHelper.fakeUser({
                    id: 'user-2',
                    username: 'user-2',
                }),
            ],
            prepareRecordsOnly: false,
        });

        const threadModels = await operator.handleThreads({
            threads: [
                {
                    ...TestHelper.fakeThread({
                        id: 'thread-id',
                    }),
                    lastFetchedAt: 0,
                },
            ],
            prepareRecordsOnly: false,
        });

        return {
            channelId: 'channel-id',
            location: 'Channel',
            author: userModels[1],
            participants: userModels,
            testID: 'thread-footer',
            thread: threadModels[0] as ThreadModel, // first model in the list should be the thread
        };
    }

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should pass the correct props to the UserAvatarsStack', async () => {
        const props = await getBaseProps();
        const {getByTestId} = renderWithEverything(<ThreadFooter {...props}/>, {database});
        const userAvatarsStack = getByTestId('user-avatars-stack');
        expect(userAvatarsStack).toHaveProp('channelId', props.channelId);
        expect(userAvatarsStack).toHaveProp('location', props.location);
        expect(userAvatarsStack.props.users).toHaveLength(2);
        expect(userAvatarsStack.props.users[0].id).toBe(props.author?.id);
        expect(userAvatarsStack.props.users[1].id).toBe(props.participants[0].id);
        expect(userAvatarsStack).toHaveProp('bottomSheetTitle', expect.objectContaining({defaultMessage: 'Thread Participants'}));
    });
});
