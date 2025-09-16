// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SelectedUserChipByIdComponent from './selected_user_chip_by_id';

import SelectedUserChipById from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'server-url';

jest.mock('./selected_user_chip_by_id', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SelectedUserChipByIdComponent).mockImplementation((props) => React.createElement('SelectedUserChipById', {...props}));

describe('SelectedUserChipById Enhanced Component', () => {
    const userId = 'user-id';

    let database: Database;
    let operator: ServerDataOperator;

    function getBaseProps(): ComponentProps<typeof SelectedUserChipById> {
        return {
            onPress: jest.fn(),
            teammateNameDisplay: General.TEAMMATE_NAME_DISPLAY.SHOW_USERNAME,
            userId,
            testID: 'test-chip',
        };
    }

    async function addUserToDatabase(user: UserProfile) {
        await operator.handleUsers({
            users: [user],
            prepareRecordsOnly: false,
        });
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

    describe('enhanced component behavior', () => {
        it('should render correctly with no user data initially', () => {
            const baseProps = getBaseProps();
            baseProps.userId = 'non-existent-user-id';
            const {getByTestId} = renderWithEverything(
                <SelectedUserChipById {...baseProps}/>,
                {database},
            );

            const chip = getByTestId('test-chip');
            expect(chip.props.user).toBeUndefined();
        });

        it('should render correctly with user data after database population', async () => {
            await addUserToDatabase(TestHelper.fakeUser({id: userId}));
            const baseProps = getBaseProps();
            baseProps.userId = userId;

            const {getByTestId} = renderWithEverything(
                <SelectedUserChipById {...baseProps}/>,
                {database},
            );

            const chip = getByTestId('test-chip');
            expect(chip).toHaveProp('user', expect.objectContaining({id: userId}));
        });
    });
});
