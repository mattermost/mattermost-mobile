// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isPostStatusUpdateProps} from './types';

describe('isPostStatusUpdateProps', () => {
    describe('valid props', () => {
        it('should return true for valid PostStatusUpdateProps', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1', 'user2', 'user3'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(true);
        });

        it('should return true with empty participantIds array', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 0,
                numTasksChecked: 0,
                participantIds: [],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(true);
        });

        it('should return true with single participant', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 1,
                numTasksChecked: 1,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(true);
        });
    });

    describe('invalid props - non-object values', () => {
        it('should return false for null', () => {
            expect(isPostStatusUpdateProps(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isPostStatusUpdateProps(undefined)).toBe(false);
        });

        it('should return false for string', () => {
            expect(isPostStatusUpdateProps('not an object')).toBe(false);
        });

        it('should return false for number', () => {
            expect(isPostStatusUpdateProps(123)).toBe(false);
        });

        it('should return false for boolean', () => {
            expect(isPostStatusUpdateProps(true)).toBe(false);
        });

        it('should return false for array', () => {
            expect(isPostStatusUpdateProps([])).toBe(false);
        });
    });

    describe('invalid props - missing properties', () => {
        it('should return false when authorUsername is missing', () => {
            const props = {
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when numTasks is missing', () => {
            const props = {
                authorUsername: 'test-user',
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when numTasksChecked is missing', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when participantIds is missing', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when playbookRunId is missing', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when runName is missing', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });
    });

    describe('invalid props - wrong property types', () => {
        it('should return false when authorUsername is not a string', () => {
            const props = {
                authorUsername: 123,
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when numTasks is not a number', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: '5',
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when numTasksChecked is not a number', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: '3',
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when participantIds is not an array', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: 'not-an-array',
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when participantIds contains non-string elements', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1', 123, 'user3'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when participantIds contains null', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1', null, 'user3'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when playbookRunId is not a string', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 123,
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when runName is not a string', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 123,
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });
    });

    describe('edge cases', () => {
        it('should return false for empty string authorUsername', () => {
            const props = {
                authorUsername: '',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            // Empty string is still a string, so it should pass type check
            expect(isPostStatusUpdateProps(props)).toBe(true);
        });

        it('should return false when participantIds contains objects', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1', {id: 'user2'}, 'user3'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should return false when participantIds contains arrays', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1', ['user2'], 'user3'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
            };

            expect(isPostStatusUpdateProps(props)).toBe(false);
        });

        it('should handle object with extra properties', () => {
            const props = {
                authorUsername: 'test-user',
                numTasks: 5,
                numTasksChecked: 3,
                participantIds: ['user1'],
                playbookRunId: 'run-123',
                runName: 'Test Run',
                extraProperty: 'should be ignored',
            };

            expect(isPostStatusUpdateProps(props)).toBe(true);
        });
    });
});

