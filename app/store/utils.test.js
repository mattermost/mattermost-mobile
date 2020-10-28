// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DeviceInfo from 'react-native-device-info';

import initialState from '@store/initial_state';
import {getStateForReset, serialize} from '@store/utils';

/*
const {currentUserId} = currentState.entities.users;
    const currentUserProfile = currentState.entities.users.profiles[currentUserId];
    const {currentTeamId} = currentState.entities.teams;
    const myPreferences = {...currentState.entities.preferences.myPreferences};
    Object.keys(myPreferences).forEach((key) => {
        if (!key.startsWith('theme--')) {
            Reflect.deleteProperty(myPreferences, key);
        }
    });
*/
describe('getStateForReset', () => {
    const currentUserId = 'current-user-id';
    const otherUserId = 'other-user-id';
    const currentTeamId = 'current-team-id';
    const currentState = {
        app: {
            build: DeviceInfo.getBuildNumber(),
            version: DeviceInfo.getVersion(),
            previousVersion: 'previousVersion',
        },
        entities: {
            users: {
                currentUserId,
                profiles: {
                    [currentUserId]: {},
                    [otherUserId]: {},
                },
            },
            teams: {
                currentTeamId,
                teams: {
                    [currentTeamId]: {
                        id: 'currentTeamId',
                        name: 'test',
                        display_name: 'Test',
                    },
                },
                myMembers: {
                    [currentTeamId]: {},
                },
            },
            preferences: {
                myPreferences: {
                    'channel_open_time--1': {},
                    'channel_open_time--2': {},
                    'direct_channel_show--1': {},
                    'direct_channel_show--2': {},
                    'display_settings--1': {},
                    'display_settings--2': {},
                    'favorite_channel--1': {},
                    'favorite_channel--2': {},
                    'flagged_post--1': {},
                    'flagged_post--2': {},
                    'group_channel_show--1': {},
                    'group_channel_show--2': {},
                    'tutorial_step--1': {},
                    'tutorial_step--2': {},
                    'theme--1': {},
                    'theme--2': {},
                },
            },
        },
        views: {
            selectServer: {
                serverUrl: 'localhost:8065',
            },
        },
    };

    it('should keep the current user\'s ID and profile', () => {
        const resetState = getStateForReset(initialState, currentState);
        const {users} = resetState.entities;
        expect(users.currentUserId).toEqual(currentUserId);
        expect(Object.keys(users.profiles).length).toEqual(1);
        expect(users.profiles[currentUserId]).toBeDefined();
    });

    it('should keep the current team', () => {
        const resetState = getStateForReset(initialState, currentState);
        const {teams} = resetState.entities;
        expect(teams.currentTeamId).toEqual(currentTeamId);
        expect(teams.teams[currentTeamId]).toEqual(currentState.entities.teams.teams[currentTeamId]);
        expect(teams.myMembers[currentTeamId]).toEqual(currentState.entities.teams.myMembers[currentTeamId]);
    });

    it('should keep theme preferences', () => {
        const resetState = getStateForReset(initialState, currentState);
        const {myPreferences} = resetState.entities.preferences;
        const preferenceKeys = Object.keys(myPreferences);
        const themeKeys = preferenceKeys.filter((key) => key.startsWith('theme--'));
        expect(themeKeys.length).toEqual(2);
    });

    it('should set previous version as current', () => {
        const resetState = getStateForReset(initialState, currentState);
        const {app} = resetState;
        expect(app.previousVersion).toStrictEqual(currentState.app.version);
    });
});

describe('Store serialzer', () => {
    it('should set the value to be undefined', () => {
        const value = serialize();
        expect(value).toBeUndefined();
    });

    it('should set the value to be null', () => {
        const value = serialize(null);
        expect(value).toBeNull();
    });

    it('should set the value to be a new array with the same values', () => {
        const initial = [1, 2, 3];
        const value = serialize(initial);
        expect(initial === value).toEqual(false);
        expect(value).toEqual(initial);
    });

    it('should set the value to be a new object with the same values', () => {
        const initial = {
            key: '123',
            value: 'some value',
        };
        const value = serialize(initial);
        expect(initial === value).toEqual(false);
        expect(value).toEqual(initial);
    });
});
