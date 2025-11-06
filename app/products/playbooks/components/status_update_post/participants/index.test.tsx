// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import Participants from './participants';

import EnhancedParticipants from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

jest.mock('./participants', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Participants).mockImplementation(
    (props) => React.createElement('Participants', {testID: 'participants', ...props}),
);

describe('EnhancedParticipants (withObservables and withDatabase)', () => {
    let database: Database;
    let operator: ServerDataOperator;
    const serverUrl = 'https://server-url.com';

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof EnhancedParticipants> {
        return {
            participantIds: ['user-1', 'user-2'],
            location: 'Channel',
            baseTextStyle: {},
        };
    }

    it('should render correctly without data in the database', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <EnhancedParticipants {...props}/>,
            {database, serverUrl},
        );

        const component = getByTestId('participants');
        expect(component).toBeTruthy();
        expect(component).toHaveProp('users', []);
    });

    it('should pass users from database when they exist', async () => {
        const user1 = TestHelper.fakeUser({id: 'user-1', username: 'user1'});
        const user2 = TestHelper.fakeUser({id: 'user-2', username: 'user2'});

        await operator.handleUsers({users: [user1, user2], prepareRecordsOnly: false});

        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(
            <EnhancedParticipants {...props}/>,
            {database, serverUrl},
        );

        const component = getByTestId('participants');
        expect(component.props.users).toHaveLength(2);
        expect(component.props.users[0].id).toBe(user1.id);
        expect(component.props.users[1].id).toBe(user2.id);
    });

    it('should update when participant ids change', async () => {
        const user1 = TestHelper.fakeUser({id: 'user-1', username: 'user1'});
        const user2 = TestHelper.fakeUser({id: 'user-2', username: 'user2'});

        await operator.handleUsers({users: [user1, user2], prepareRecordsOnly: false});

        const props = getBaseProps();
        const {getByTestId, rerender} = renderWithEverything(
            <EnhancedParticipants {...props}/>,
            {database, serverUrl},
        );

        const component1 = getByTestId('participants');
        expect(component1.props.users).toHaveLength(2);
        expect(component1.props.users[0].id).toBe(user1.id);
        expect(component1.props.users[1].id).toBe(user2.id);

        props.participantIds = ['user-1'];
        rerender(<EnhancedParticipants {...props}/>);

        const component2 = getByTestId('participants');
        expect(component2.props.users).toHaveLength(1);
        expect(component2.props.users[0].id).toBe(user1.id);
    });
});

