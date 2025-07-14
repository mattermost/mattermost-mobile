// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import React from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {getTeamById} from '@queries/servers/team';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import CategoriesList from './categories_list';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type Database from '@nozbe/watermelondb/Database';

describe('components/categories_list', () => {
    let database: Database;
    let operator: ServerDataOperator;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
        operator = server.operator;

        const team = await getTeamById(database, TestHelper.basicTeam!.id);
        await database.write(async () => {
            await team?.update(() => {
                team.displayName = 'Test Team!';
            });
        });
    });

    it('should render', async () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                moreThanOneTeam={false}
                hasChannels={true}
                draftsCount={0}
                scheduledPostHasError={false}
                scheduledPostCount={0}
            />,
            {database},
        );
        await waitFor(() => {
            expect(wrapper.toJSON()).toBeTruthy();
        });
    });

    it('should render channel list with thread menu', async () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                isCRTEnabled={true}
                moreThanOneTeam={false}
                hasChannels={true}
                draftsCount={0}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />,
            {database},
        );

        await waitFor(() => {
            expect(wrapper.toJSON()).toBeTruthy();
        });
    });

    it('should render channel list with Draft menu', async () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                isCRTEnabled={true}
                moreThanOneTeam={false}
                hasChannels={true}
                draftsCount={1}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />,
            {database},
        );
        await waitFor(() => {
            expect(wrapper.getByText('Drafts')).toBeTruthy();
        });
    });

    // Skipping this test because the snapshot became too big and
    // it errors out.
    it.skip('should render team error', async () => {
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: ''}],
            prepareRecordsOnly: false,
        });

        jest.useFakeTimers();
        const wrapper = renderWithEverything(
            <CategoriesList
                moreThanOneTeam={false}
                hasChannels={true}
                draftsCount={0}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />,
            {database},
        );

        act(() => {
            jest.runAllTimers();
        });

        jest.useRealTimers();

        await waitFor(() => {
            expect(wrapper.toJSON()).toMatchSnapshot();
        });
    });

    // Skipping this test because the snapshot became too big and
    // it errors out.
    it.skip('should render channels error', async () => {
        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: TestHelper.basicTeam!.id}],
            prepareRecordsOnly: false,
        });
        jest.useFakeTimers();
        const wrapper = renderWithEverything(
            <CategoriesList
                moreThanOneTeam={true}
                hasChannels={false}
                draftsCount={0}
                scheduledPostCount={0}
                scheduledPostHasError={false}
            />,
            {database},
        );
        act(() => {
            jest.runAllTimers();
        });
        jest.useRealTimers();
        await waitFor(() => {
            expect(wrapper.toJSON()).toMatchSnapshot();
        });
    });

    it('should render channel list with Draft menu if scheduledPostCount is greater than 0 and scheduledPost feature is enabled', () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                isCRTEnabled={true}
                moreThanOneTeam={false}
                hasChannels={true}
                draftsCount={0}
                scheduledPostCount={1}
                scheduledPostHasError={false}
                scheduledPostsEnabled={true}
            />,
            {database},
        );
        expect(wrapper.getByText('Drafts')).toBeTruthy();
    });

    it('should not render channel list with Draft menu if scheduledPostCount is greater than 0 and scheduledPost feature is disabled', () => {
        const wrapper = renderWithEverything(
            <CategoriesList
                isCRTEnabled={true}
                moreThanOneTeam={false}
                hasChannels={true}
                draftsCount={0}
                scheduledPostCount={1}
                scheduledPostHasError={false}
                scheduledPostsEnabled={false}
            />,
            {database},
        );
        expect(wrapper.queryByText('Drafts')).not.toBeTruthy();
    });
});
