// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ParticipantPlaybooks from './participant_playbooks';

import ParticipantPlaybooksIndex from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type {PlaybookRunModel} from '@playbooks/database/models';

// Mock the ParticipantPlaybooks component
jest.mock('./participant_playbooks');
jest.mocked(ParticipantPlaybooks).mockImplementation((props) => {
    return React.createElement('ParticipantPlaybooks', {
        testID: 'participant-playbooks',
        ...props,
    });
});

describe('ParticipantPlaybooks Index', () => {
    const serverUrl = 'server-url';
    const currentUserId = 'current-user-id';

    let database: Database;
    let operator: ServerDataOperator;

    const componentId = 'ParticipantPlaybooks' as const;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('renders ParticipantPlaybooks component with no data', () => {
        const props = {
            componentId,
        };

        const {getByTestId} = renderWithEverything(
            <ParticipantPlaybooksIndex {...props}/>,
            {database},
        );

        const component = getByTestId('participant-playbooks');
        expect(component).toBeTruthy();
        expect(component.props.componentId).toBe('ParticipantPlaybooks');
        expect(component.props.currentUserId).toBe('');
        expect(component.props.cachedPlaybookRuns).toEqual([]);
    });

    it('renders ParticipantPlaybooks component with current user data', async () => {
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                value: currentUserId,
            }],
            prepareRecordsOnly: false,
        });

        const runs = TestHelper.createPlaybookRuns(4, 1, 1);
        runs[0].participant_ids = [currentUserId];
        runs[1].participant_ids = ['other-user-id'];
        runs[2].participant_ids = [currentUserId];
        runs[3].participant_ids = ['other-user-id'];

        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs,
        });

        const props = {
            componentId,
        };

        const {getByTestId} = renderWithEverything(
            <ParticipantPlaybooksIndex {...props}/>,
            {database},
        );

        const component = getByTestId('participant-playbooks');
        expect(component).toBeTruthy();
        expect(component.props.componentId).toBe('ParticipantPlaybooks');
        expect(component.props.currentUserId).toBe(currentUserId);
        expect(component.props.cachedPlaybookRuns).toHaveLength(2);
        const runIds = component.props.cachedPlaybookRuns.map((r: PlaybookRunModel) => r.id);
        expect(runIds).toContain(runs[0].id);
        expect(runIds).toContain(runs[2].id);
    });

    it('reacts to current user changes', async () => {
        const props = {
            componentId,
        };

        const otherUserId = 'other-user-id';
        const runs = TestHelper.createPlaybookRuns(4, 1, 1);
        runs[0].participant_ids = [currentUserId];
        runs[1].participant_ids = [otherUserId];
        runs[2].participant_ids = [currentUserId];
        runs[3].participant_ids = [otherUserId];
        await operator.handlePlaybookRun({
            prepareRecordsOnly: false,
            runs,
        });

        const {getByTestId} = renderWithEverything(
            <ParticipantPlaybooksIndex {...props}/>,
            {database},
        );

        let component = getByTestId('participant-playbooks');
        expect(component.props.currentUserId).toBe('');
        expect(component.props.cachedPlaybookRuns).toEqual([]);

        // Add current user to database
        await act(async () => {
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: currentUserId,
                }],
                prepareRecordsOnly: false,
            });
        });

        // Component should react to the change
        await waitFor(() => {
            component = getByTestId('participant-playbooks');
            expect(component.props.currentUserId).toBe(currentUserId);
            expect(component.props.cachedPlaybookRuns).toHaveLength(2);
            const runIds = component.props.cachedPlaybookRuns.map((r: PlaybookRunModel) => r.id);
            expect(runIds).toContain(runs[0].id);
            expect(runIds).toContain(runs[2].id);
        });

        // Add current user to database
        await act(async () => {
            await operator.handleSystem({
                systems: [{
                    id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID,
                    value: otherUserId,
                }],
                prepareRecordsOnly: false,
            });
        });

        // Component should react to the change
        await waitFor(() => {
            component = getByTestId('participant-playbooks');
            expect(component.props.currentUserId).toBe(otherUserId);
            expect(component.props.cachedPlaybookRuns).toHaveLength(2);
            const runIds = component.props.cachedPlaybookRuns.map((r: PlaybookRunModel) => r.id);
            expect(runIds).toContain(runs[1].id);
            expect(runIds).toContain(runs[3].id);
        });
    });
});
