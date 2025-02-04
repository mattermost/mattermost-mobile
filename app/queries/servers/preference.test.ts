// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import {CATEGORIES_TO_KEEP} from '@constants/preferences';
import DatabaseManager from '@database/manager';

import {
    prepareMyPreferences,
    queryPreferencesByCategoryAndName,
    getThemeForCurrentTeam,
    deletePreferences,
    differsFromLocalNameFormat,
    getHasCRTChanged,
    queryDisplayNamePreferences,
    querySavedPostsPreferences,
    queryThemePreferences,
    querySidebarPreferences,
    queryEmojiPreferences,
    queryAdvanceSettingsPreferences,
} from './preference';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

describe('Preference Queries', () => {
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    describe('prepareMyPreferences', () => {
        it('should prepare preference records', async () => {
            const preferences = [
                {
                    user_id: 'user1',
                    category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                    name: 'name_format',
                    value: 'username',
                },
                {
                    user_id: 'user1',
                    category: Preferences.CATEGORIES.THEME,
                    name: 'theme',
                    value: '{"type":"dark"}',
                },
            ];

            const records = await prepareMyPreferences(operator, preferences);
            expect(records.length).toBe(2);
            expect(records[0].name).toBe('name_format');
            expect(records[0]._preparedState).toBe('create');

            expect(records[1].name).toBe('theme');
            expect(records[1]._preparedState).toBe('create');
        });

        it('should handle sync flag', async () => {
            const oldValue = 'username';
            const newValue = 'username-new';

            const preferences = [{
                user_id: 'user1',
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: 'name_format',
                value: newValue,
            }];

            await operator.handlePreferences({
                preferences: [
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                        name: 'name_format',
                        value: oldValue,
                    },

                    // with sync, this record will be deleted since it's not in the preferences array
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.THEME,
                        name: 'theme',
                        value: '{"type":"dark"}',
                    },
                ],
                prepareRecordsOnly: false,
            });

            await database.write(async () => {
                const records = await prepareMyPreferences(operator, preferences, true);

                expect(records[0]._preparedState).toBe('update');
                expect(records[1]._preparedState).toBe('destroyPermanently');

                // without this, the test will fail because of this error:
                // Diagnostic error: record.prepareUpdate was called on Preference#xxxx but wasn't sent to batch() synchronously -- this is bad!
                await database.batch(...records);
            });

            const storedPrefs = await queryDisplayNamePreferences(database).fetch();
            expect(storedPrefs.length).toBe(1);
            expect(storedPrefs[0].value).toEqual(newValue);

            const themePrefs = await queryThemePreferences(database).fetch();
            expect(themePrefs.length).toBe(0);
        });
    });

    describe('queryPreferencesByCategoryAndName', () => {
        it('should query by category only', async () => {
            await operator.handlePreferences({
                preferences: [
                    {
                        user_id: 'user1',
                        category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                        name: 'test1',
                        value: 'value1',
                    },
                    {
                        user_id: 'user1',
                        category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                        name: 'test2',
                        value: 'value2',
                    },
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                        name: 'name_format',
                        value: 'username',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const prefs = await queryPreferencesByCategoryAndName(database, CATEGORIES_TO_KEEP.ADVANCED_SETTINGS).fetch();
            expect(prefs.length).toBe(2);
        });

        it('should query by category and name', async () => {
            await operator.handlePreferences({
                preferences: [
                    {
                        user_id: 'user1',
                        category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                        name: 'test1',
                        value: 'value1',
                    },
                    {
                        user_id: 'user1',
                        category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                        name: 'test2',
                        value: 'value2',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const prefs = await queryPreferencesByCategoryAndName(database, CATEGORIES_TO_KEEP.ADVANCED_SETTINGS, 'test1').fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].name).toBe('test1');
        });

        it('should query by category, name and value', async () => {
            await operator.handlePreferences({
                preferences: [
                    {
                        user_id: 'user1',
                        category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                        name: 'test1',
                        value: 'value1',
                    },
                    {
                        user_id: 'user1',
                        category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                        name: 'test1',
                        value: 'value2',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const prefs = await queryPreferencesByCategoryAndName(database, CATEGORIES_TO_KEEP.ADVANCED_SETTINGS, 'test1', 'value1').fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].value).toBe('value1');
        });
    });

    describe('getThemeForCurrentTeam', () => {
        it('should return undefined if no theme exists', async () => {
            const theme = await getThemeForCurrentTeam(database);
            expect(theme).toBeUndefined();
        });

        it('should return theme for current team', async () => {
            const teamId = 'team1';
            const themeValue = {
                type: 'dark',
                sidebarBg: '#000000',
            };

            await operator.handleSystem({
                systems: [{id: 'currentTeamId', value: teamId}],
                prepareRecordsOnly: false,
            });

            await operator.handlePreferences({
                preferences: [{
                    user_id: 'user1',
                    category: Preferences.CATEGORIES.THEME,
                    name: teamId,
                    value: JSON.stringify(themeValue),
                }],
                prepareRecordsOnly: false,
            });

            const theme = await getThemeForCurrentTeam(database);
            expect(theme).toEqual(themeValue);
        });
    });

    describe('deletePreferences', () => {
        it('should delete preferences', async () => {
            const pref1 = {
                user_id: 'user1',
                category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                name: 'test1',
                value: 'value1',
            };

            await operator.handlePreferences({
                preferences: [
                    pref1,
                    {
                        user_id: 'user1',
                        category: CATEGORIES_TO_KEEP.ADVANCED_SETTINGS,
                        name: 'test2',
                        value: 'value2',
                    },
                ],
                prepareRecordsOnly: false,
            });

            const prefsToDelete = [pref1];

            const success = await deletePreferences({database, operator}, prefsToDelete);
            expect(success).toBe(true);

            const remaining = await queryPreferencesByCategoryAndName(database, CATEGORIES_TO_KEEP.ADVANCED_SETTINGS).fetch();
            expect(remaining.length).toBe(1);
            expect(remaining[0].name).toBe('test2');
        });

        it('should handle empty prefs gracefully', async () => {
            const success = await deletePreferences({database, operator}, []);
            expect(success).toBe(true);
        });
    });

    describe('differsFromLocalNameFormat', () => {
        it('should detect when name format differs', async () => {
            await operator.handlePreferences({
                preferences: [{
                    user_id: 'user1',
                    category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                    name: Preferences.NAME_NAME_FORMAT,
                    value: 'username',
                }],
                prepareRecordsOnly: false,
            });

            const newPrefs = [{
                user_id: 'user1',
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: Preferences.NAME_NAME_FORMAT,
                value: 'nickname',
            }];

            const differs = await differsFromLocalNameFormat(database, newPrefs);
            expect(differs).toBe(true);
        });

        it('should handle empty preferences', async () => {
            const differs = await differsFromLocalNameFormat(database, []);
            expect(differs).toBe(false);
        });
    });

    describe('getHasCRTChanged', () => {
        it('should detect CRT changes', async () => {
            await operator.handlePreferences({
                preferences: [{
                    user_id: 'user1',
                    category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                    name: Preferences.COLLAPSED_REPLY_THREADS,
                    value: 'off',
                }],
                prepareRecordsOnly: false,
            });

            const newPrefs = [{
                user_id: 'user1',
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: Preferences.COLLAPSED_REPLY_THREADS,
                value: 'on',
            }];

            const changed = await getHasCRTChanged(database, newPrefs);
            expect(changed).toBe(true);
        });

        it('should handle no CRT preference', async () => {
            const changed = await getHasCRTChanged(database, []);
            expect(changed).toBe(false);
        });
    });

    describe('category-specific queries', () => {
        beforeEach(async () => {
            await operator.handlePreferences({
                preferences: [
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                        name: 'display_test',
                        value: 'display_value',
                    },
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.SAVED_POST,
                        name: 'post1',
                        value: 'saved',
                    },
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.THEME,
                        name: 'theme1',
                        value: '{"type":"dark"}',
                    },
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.SIDEBAR_SETTINGS,
                        name: 'sidebar_test',
                        value: 'sidebar_value',
                    },
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.EMOJI,
                        name: 'emoji_test',
                        value: 'emoji_value',
                    },
                    {
                        user_id: 'user1',
                        category: Preferences.CATEGORIES.ADVANCED_SETTINGS,
                        name: 'advanced_test',
                        value: 'advanced_value',
                    },
                ],
                prepareRecordsOnly: false,
            });
        });

        it('should query display name preferences', async () => {
            const prefs = await queryDisplayNamePreferences(database).fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].category).toBe(Preferences.CATEGORIES.DISPLAY_SETTINGS);
        });

        it('should query saved posts preferences', async () => {
            const prefs = await querySavedPostsPreferences(database).fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].category).toBe(Preferences.CATEGORIES.SAVED_POST);
        });

        it('should query theme preferences', async () => {
            const prefs = await queryThemePreferences(database).fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].category).toBe(Preferences.CATEGORIES.THEME);
        });

        it('should query sidebar preferences', async () => {
            const prefs = await querySidebarPreferences(database).fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].category).toBe(Preferences.CATEGORIES.SIDEBAR_SETTINGS);
        });

        it('should query emoji preferences', async () => {
            const prefs = await queryEmojiPreferences(database, 'emoji_test').fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].category).toBe(Preferences.CATEGORIES.EMOJI);
        });

        it('should query advanced settings preferences', async () => {
            const prefs = await queryAdvanceSettingsPreferences(database).fetch();
            expect(prefs.length).toBe(1);
            expect(prefs[0].category).toBe(Preferences.CATEGORIES.ADVANCED_SETTINGS);
        });
    });
});
