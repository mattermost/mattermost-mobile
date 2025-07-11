// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import DatabaseManager from '@database/manager';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import PlaybookCardComponent from './playbook_card';

import PlaybookCard from './';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';

jest.mock('./playbook_card');
jest.mocked(PlaybookCardComponent).mockImplementation(
    (props) => React.createElement('PlaybookCard', {testID: 'playbook-card', ...props}),
);

const serverUrl = 'server-url';

describe('PlaybookCard', () => {
    const runId = 'run-id';
    const ownerId = 'owner-id';
    const participantId = 'participant-id';

    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(() => {
        DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('api run', () => {
        function getBaseProps(): ComponentProps<typeof PlaybookCard> {
            return {
                run: TestHelper.fakePlaybookRun({
                    id: runId,
                    owner_user_id: ownerId,
                    participant_ids: [ownerId, participantId],
                    checklists: [
                        TestHelper.fakePlaybookChecklist(runId, {
                            id: 'checklist-1',
                            title: 'Checklist 1',
                            items: [
                                TestHelper.fakePlaybookChecklistItem('checklist-1', {
                                    id: 'item-1',
                                    title: 'Item 1',
                                }),
                                TestHelper.fakePlaybookChecklistItem('checklist-1', {
                                    id: 'item-2',
                                    title: 'Item 2',
                                    state: 'closed',
                                }),
                            ],
                        }),
                    ],
                }),
                location: 'PlaybookRuns',
            };
        }

        it('should render correctly with no data', () => {
            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookCard {...props}/>, {database});

            const playbookCard = getByTestId('playbook-card');
            expect(playbookCard).toBeTruthy();
            expect(playbookCard.props.run).toBe(props.run);
            expect(playbookCard.props.progress).toBe(50);

            expect(playbookCard.props.participants).toHaveLength(0);
            expect(playbookCard.props.owner).toBeUndefined();
        });

        it('should render correctly with data', async () => {
            await operator.handleUsers({
                prepareRecordsOnly: false,
                users: [
                    TestHelper.fakeUser({id: ownerId}),
                    TestHelper.fakeUser({id: participantId}),
                ],
            });

            const props = getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookCard {...props}/>, {database});

            const playbookCard = getByTestId('playbook-card');
            expect(playbookCard.props.run).toBe(props.run);
            expect(playbookCard.props.progress).toBe(50);

            expect(playbookCard.props.participants).toHaveLength(1);
            expect(playbookCard.props.participants[0].id).toBe(participantId);
            expect(playbookCard.props.owner.id).toBe(ownerId);
        });
    });

    describe('local run', () => {
        async function getBaseProps(): Promise<ComponentProps<typeof PlaybookCard>> {
            const model = await operator.handlePlaybookRun({
                prepareRecordsOnly: false,
                processChildren: true,
                runs: [TestHelper.fakePlaybookRun({
                    id: runId,
                    owner_user_id: ownerId,
                    participant_ids: [ownerId, participantId],
                    checklists: [
                        TestHelper.fakePlaybookChecklist(runId, {
                            id: 'checklist-1',
                            title: 'Checklist 1',
                            items: [
                                TestHelper.fakePlaybookChecklistItem('checklist-1', {
                                    id: 'item-1',
                                    title: 'Item 1',
                                }),
                                TestHelper.fakePlaybookChecklistItem('checklist-1', {
                                    id: 'item-2',
                                    title: 'Item 2',
                                    state: 'closed',
                                }),
                            ],
                        }),
                    ],
                })],
            });
            return {
                run: model[0] as PlaybookRunModel,
                location: 'PlaybookRuns',
            };
        }

        it('should render correctly with no data', async () => {
            const props = await getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookCard {...props}/>, {database});

            const playbookCard = getByTestId('playbook-card');
            expect(playbookCard).toBeTruthy();
            expect(playbookCard.props.run).toBe(props.run);
            expect(playbookCard.props.progress).toBe(50);

            expect(playbookCard.props.participants).toHaveLength(0);
            expect(playbookCard.props.owner).toBeUndefined();
        });

        it('should render correctly with data', async () => {
            await operator.handleUsers({
                prepareRecordsOnly: false,
                users: [
                    TestHelper.fakeUser({id: ownerId}),
                    TestHelper.fakeUser({id: participantId}),
                ],
            });

            const props = await getBaseProps();
            const {getByTestId} = renderWithEverything(<PlaybookCard {...props}/>, {database});

            const playbookCard = getByTestId('playbook-card');
            expect(playbookCard.props.run).toBe(props.run);
            expect(playbookCard.props.progress).toBe(50);

            expect(playbookCard.props.participants).toHaveLength(1);
            expect(playbookCard.props.participants[0].id).toBe(participantId);
            expect(playbookCard.props.owner.id).toBe(ownerId);
        });
    });
});
