// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PLAYBOOK_TABLES} from '@playbooks/constants/database';

import serverMigrations from './index';

describe('server migrations', () => {
    it('adds timeline events to existing playbook runs in schema version 21', () => {
        const migration = serverMigrations.sortedMigrations.find(({toVersion}) => toVersion === 21);

        expect(migration).toEqual({
            toVersion: 21,
            steps: [{
                type: 'add_columns',
                table: PLAYBOOK_TABLES.PLAYBOOK_RUN,
                columns: [{name: 'timeline_events', type: 'string', isOptional: true}],
            }],
        });
    });
});
