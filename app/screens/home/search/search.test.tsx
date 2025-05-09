// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {addSearchToTeamSearchHistory} from '@actions/local/team';
import {searchPosts, searchFiles} from '@actions/remote/search';
import useTabs from '@hooks/use_tabs';
import {bottomSheet} from '@screens/navigation';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SearchScreen from './search';

import type {TeamModel} from '@database/models/server';
import type {Database} from '@nozbe/watermelondb';

// Some subcomponents require react-native-camera-roll, which is not available in the test environment
jest.mock('@react-native-camera-roll/camera-roll', () => ({}));

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({
        getState: () => ({
            index: 0,
            routes: [{params: {searchTerm: ''}}],
        }),
    }),
    useIsFocused: () => true,
}));

jest.mock('@actions/local/post', () => ({
    getPosts: jest.fn().mockResolvedValue([]),
}));

jest.mock('@actions/local/team', () => ({
    addSearchToTeamSearchHistory: jest.fn(),
}));

jest.mock('@actions/remote/search', () => ({
    searchPosts: jest.fn().mockResolvedValue({order: [], matches: {}}),
    searchFiles: jest.fn().mockResolvedValue({files: [], channels: []}),
}));

jest.mock('@mattermost/hardware-keyboard', () => ({
    useHardwareKeyboardEvents: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

jest.mock('@hooks/use_tabs', () => ({
    __esModule: true,
    default: jest.fn(jest.requireActual('@hooks/use_tabs').default),
}));

describe('SearchScreen', () => {
    const baseProps = {
        teamId: 'team1',
        teams: [
            {id: 'team1', displayName: 'Team 1'},
            {id: 'team2', displayName: 'Team 2'},
        ] as TeamModel[],
        crossTeamSearchEnabled: true,
    };

    let database: Database;
    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders search screen correctly', () => {
        const {getByTestId, getByText, getByPlaceholderText} = renderWithEverything(
            <SearchScreen {...baseProps}/>,
            {database},
        );
        expect(getByTestId('search_messages.screen')).toBeTruthy();

        // The page title
        expect(getByText('Search')).toBeTruthy();

        // The search input with the expected placeholder
        expect(getByPlaceholderText('Search messages & files')).toBeTruthy();
    });

    it('handles search input changes', () => {
        const {getByTestId} = renderWithEverything(
            <SearchScreen {...baseProps}/>,
            {database},
        );

        const searchInput = getByTestId('navigation.header.search_bar.search.input');
        act(() => {
            fireEvent.changeText(searchInput, 'test search');
        });
        expect(searchInput.props.value).toBe('test search');
    });

    it('performs search when submitting', async () => {
        const {getByTestId} = renderWithEverything(
            <SearchScreen {...baseProps}/>,
            {database},
        );

        const searchInput = getByTestId('navigation.header.search_bar.search.input');
        await act(async () => {
            fireEvent.changeText(searchInput, 'test search');
        });

        await act(async () => {
            fireEvent(searchInput, 'submitEditing');
        });

        await waitFor(() => {
            expect(searchPosts).toHaveBeenCalledWith(
                expect.any(String),
                'team1',
                expect.objectContaining({terms: 'test search'}),
            );
            expect(searchFiles).toHaveBeenCalledWith(
                expect.any(String),
                'team1',
                expect.objectContaining({terms: 'test search'}),
            );
        });
    });

    it('handles team changes', async () => {
        const {getByTestId} = renderWithEverything(
            <SearchScreen {...baseProps}/>,
            {database},
        );

        const teamPicker = getByTestId('team_picker.button');
        act(() => {
            fireEvent.press(teamPicker);
        });

        expect(teamPicker).toBeTruthy();
        expect(bottomSheet).toHaveBeenCalled();
    });

    it('clears search when clear button is pressed', async () => {
        const {getByTestId} = renderWithEverything(
            <SearchScreen {...baseProps}/>,
            {database},
        );

        const searchInput = getByTestId('navigation.header.search_bar.search.input');
        act(() => {
            fireEvent.changeText(searchInput, 'test search');
        });

        const clearButton = getByTestId('navigation.header.search_bar.search.clear.button');
        act(() => {
            fireEvent.press(clearButton);
        });

        expect(searchInput.props.value).toBe('');
    });

    it('adds search to team history when searching in a specific team', async () => {
        const {getByTestId} = renderWithEverything(
            <SearchScreen {...baseProps}/>,
            {database},
        );

        const searchInput = getByTestId('navigation.header.search_bar.search.input');
        await act(async () => {
            fireEvent.changeText(searchInput, 'test search');
        });
        await act(async () => {
            fireEvent(searchInput, 'submitEditing');
        });

        await waitFor(() => {
            expect(addSearchToTeamSearchHistory).toHaveBeenCalledWith(
                expect.any(String),
                'team1',
                'test search',
            );
        });
    });

    it('initializes with correct tabs configuration', () => {
        renderWithEverything(
            <SearchScreen {...baseProps}/>,
            {database},
        );

        expect(useTabs).toHaveBeenCalledWith(
            'MESSAGES',
            [
                expect.objectContaining({id: 'MESSAGES', name: expect.objectContaining({defaultMessage: 'Messages'})}),
                expect.objectContaining({id: 'FILES', name: expect.objectContaining({defaultMessage: 'Files'})}),
            ],
            undefined,
            expect.any(String),
        );
    });
});
