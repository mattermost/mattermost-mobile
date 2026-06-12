// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {updateDmGmDisplayName} from '@actions/local/channel';
import {fetchPostById} from '@actions/remote/post';
import {handleCRTToggled} from '@actions/remote/preference';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPostById} from '@queries/servers/post';
import {deletePreferences, differsFromLocalNameFormat, getHasCRTChanged} from '@queries/servers/preference';
import EphemeralStore from '@store/ephemeral_store';

import {handlePreferenceChangedEvent, handlePreferencesChangedEvent, handlePreferencesDeletedEvent} from './preferences';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/local/channel');
jest.mock('@actions/remote/post');
jest.mock('@actions/remote/preference');
jest.mock('@database/manager');
jest.mock('@queries/servers/post');
jest.mock('@queries/servers/preference');
jest.mock('@store/ephemeral_store');

describe('WebSocket Preferences Actions', () => {
    const serverUrl = 'baseHandler.test.com';
    let operator: ServerDataOperator;

    beforeEach(async () => {
        jest.clearAllMocks();

        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        jest.spyOn(operator, 'handlePreferences').mockResolvedValue([]);

        jest.mocked(EphemeralStore.isEnablingCRT).mockReturnValue(false);
        jest.mocked(EphemeralStore.isRecentlyUnsavedSavedPost).mockReturnValue(false);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('handlePreferenceChangedEvent', () => {
        const mockPreference = {
            category: Preferences.CATEGORIES.SAVED_POST,
            name: 'post1',
            user_id: 'user1',
            value: 'true',
        };

        it('should handle enabling CRT', async () => {
            jest.mocked(EphemeralStore.isEnablingCRT).mockReturnValue(true);

            const msg = {
                data: {
                    preference: JSON.stringify(mockPreference),
                },
            } as WebSocketMessage;

            await handlePreferenceChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).not.toHaveBeenCalled();
        });

        it('should handle preference change with saved post', async () => {
            const msg = {
                data: {
                    preference: JSON.stringify(mockPreference),
                },
            } as WebSocketMessage;

            jest.mocked(differsFromLocalNameFormat).mockResolvedValue(false);
            jest.mocked(getHasCRTChanged).mockResolvedValue(false);
            jest.mocked(getPostById).mockResolvedValue(undefined);

            await handlePreferenceChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).toHaveBeenCalledWith({
                prepareRecordsOnly: false,
                preferences: [mockPreference],
            });
            expect(fetchPostById).toHaveBeenCalledWith(serverUrl, 'post1', false);
        });

        it('should handle name format changes', async () => {
            const msg = {
                data: {
                    preference: JSON.stringify(mockPreference),
                },
            } as WebSocketMessage;

            jest.mocked(differsFromLocalNameFormat).mockResolvedValue(true);
            jest.mocked(getHasCRTChanged).mockResolvedValue(false);

            await handlePreferenceChangedEvent(serverUrl, msg);

            expect(updateDmGmDisplayName).toHaveBeenCalledWith(serverUrl);
        });

        it('should handle CRT changes', async () => {
            const msg = {
                data: {
                    preference: JSON.stringify(mockPreference),
                },
            } as WebSocketMessage;

            jest.mocked(differsFromLocalNameFormat).mockResolvedValue(false);
            jest.mocked(getHasCRTChanged).mockResolvedValue(true);

            await handlePreferenceChangedEvent(serverUrl, msg);

            expect(handleCRTToggled).toHaveBeenCalledWith(serverUrl);
        });

        it('should skip a stale saved-post re-save coming from a local unsave', async () => {
            // The single preference is a SAVED_POST/value='true' that the user just
            // unsaved locally; the echoed websocket event must be filtered out so we
            // don't re-add the post that was removed.
            jest.mocked(EphemeralStore.isRecentlyUnsavedSavedPost).mockReturnValue(true);

            const msg = {
                data: {
                    preference: JSON.stringify(mockPreference),
                },
            } as WebSocketMessage;

            await handlePreferenceChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).not.toHaveBeenCalled();
        });
    });

    describe('handlePreferencesChangedEvent', () => {
        const mockPreferences = [{
            category: Preferences.CATEGORIES.SAVED_POST,
            name: 'post1',
            user_id: 'user1',
            value: 'true',
        }];

        it('should handle enabling CRT', async () => {
            jest.mocked(EphemeralStore.isEnablingCRT).mockReturnValue(true);

            const msg = {
                data: {
                    preferences: JSON.stringify(mockPreferences),
                },
            } as WebSocketMessage;

            await handlePreferencesChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).not.toHaveBeenCalled();
        });

        it('should handle multiple preferences change', async () => {
            const msg = {
                data: {
                    preferences: JSON.stringify(mockPreferences),
                },
            } as WebSocketMessage;

            jest.mocked(differsFromLocalNameFormat).mockResolvedValue(false);
            jest.mocked(getHasCRTChanged).mockResolvedValue(false);
            jest.mocked(getPostById).mockResolvedValue(undefined);

            await handlePreferencesChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).toHaveBeenCalledWith({
                prepareRecordsOnly: false,
                preferences: mockPreferences,
            });
            expect(fetchPostById).toHaveBeenCalledWith(serverUrl, 'post1', false);
        });

        it('should ignore stale saved post preferences after a local unsave', async () => {
            const msg = {
                data: {
                    preferences: JSON.stringify(mockPreferences),
                },
            } as WebSocketMessage;

            jest.mocked(EphemeralStore.isRecentlyUnsavedSavedPost).mockReturnValue(true);

            await handlePreferencesChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).not.toHaveBeenCalled();
            expect(fetchPostById).not.toHaveBeenCalled();
        });

        it('should handle name format changes in bulk', async () => {
            const msg = {
                data: {
                    preferences: JSON.stringify(mockPreferences),
                },
            } as WebSocketMessage;

            jest.mocked(differsFromLocalNameFormat).mockResolvedValue(true);
            jest.mocked(getHasCRTChanged).mockResolvedValue(false);

            await handlePreferencesChangedEvent(serverUrl, msg);

            expect(updateDmGmDisplayName).toHaveBeenCalledWith(serverUrl);
        });

        it('should skip when the entire batch is stale saved-post re-saves', async () => {
            jest.mocked(EphemeralStore.isRecentlyUnsavedSavedPost).mockReturnValue(true);

            const msg = {
                data: {
                    preferences: JSON.stringify(mockPreferences),
                },
            } as WebSocketMessage;

            await handlePreferencesChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).not.toHaveBeenCalled();
        });

        it('should keep non-stale preferences and only drop the stale saved post', async () => {
            const stalePost = {
                category: Preferences.CATEGORIES.SAVED_POST,
                name: 'stale-post',
                user_id: 'user1',
                value: 'true',
            };
            const otherPreference = {
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: 'name_format',
                user_id: 'user1',
                value: 'full_name',
            };

            // Only the saved-post entry is in the recently-unsaved set.
            jest.mocked(EphemeralStore.isRecentlyUnsavedSavedPost).mockImplementation((_, name) => name === 'stale-post');
            jest.mocked(differsFromLocalNameFormat).mockResolvedValue(false);
            jest.mocked(getHasCRTChanged).mockResolvedValue(false);
            jest.mocked(getPostById).mockResolvedValue(undefined);

            const msg = {
                data: {
                    preferences: JSON.stringify([stalePost, otherPreference]),
                },
            } as WebSocketMessage;

            await handlePreferencesChangedEvent(serverUrl, msg);

            expect(operator.handlePreferences).toHaveBeenCalledWith({
                prepareRecordsOnly: false,
                preferences: [otherPreference],
            });
        });
    });

    describe('handlePreferencesDeletedEvent', () => {
        const mockPreferences = [{
            category: Preferences.CATEGORIES.SAVED_POST,
            name: 'post1',
            user_id: 'user1',
            value: 'true',
        }];

        it('should delete preferences', async () => {
            const msg = {
                data: {
                    preferences: JSON.stringify(mockPreferences),
                },
            } as WebSocketMessage;

            await handlePreferencesDeletedEvent(serverUrl, msg);

            expect(deletePreferences).toHaveBeenCalled();
        });

        it('should handle invalid preferences data', async () => {
            const msg = {
                data: {
                    preferences: 'invalid-json',
                },
            } as WebSocketMessage;

            await handlePreferencesDeletedEvent(serverUrl, msg);

            expect(deletePreferences).not.toHaveBeenCalled();
        });
    });
});
