// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import TeamList from './index';

import type Database from '@nozbe/watermelondb/Database';
import type TeamModel from '@typings/database/models/servers/team';

describe('TeamList', () => {
    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });
    const teams = [
        {id: 'team1', displayName: 'Team 1'} as TeamModel,
        {id: 'team2', displayName: 'Team 2'} as TeamModel,
    ];
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    it('should call onPress when a team is pressed', () => {
        const onPress = jest.fn();
        const {getByText} = renderWithEverything(
            <TeamList
                teams={teams}
                onPress={onPress}
            />,
            {database},
        );
        fireEvent.press(getByText('Team 1'));
        expect(onPress).toHaveBeenCalledWith('team1');
    });

    it('should render loading component when loading is true', () => {
        const {getByTestId} = renderWithEverything(
            <TeamList
                teams={teams}
                onPress={jest.fn()}
                loading={true}
            />,
            {database},
        );
        expect(getByTestId('team_list.loading')).toBeTruthy();
    });

    it('should render separator after the first item when separatorAfterFirstItem is true', () => {
        const {getByTestId} = renderWithEverything(
            <TeamList
                teams={teams}
                onPress={jest.fn()}
                separatorAfterFirstItem={true}
            />,
            {database},
        );
        expect(getByTestId('team_list.separator')).toBeTruthy();
    });
});
