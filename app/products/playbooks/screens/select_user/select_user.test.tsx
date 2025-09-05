// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ComponentProps} from 'react';

import {fetchProfilesInTeam, searchProfiles} from '@actions/remote/user';
import Button from '@components/button';
import SearchBar from '@components/search';
import ServerUserList from '@components/server_user_list';
import {General, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {popTopScreen} from '@screens/navigation';
import {act, renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import SelectUser from './select_user';

import type {Database} from '@nozbe/watermelondb';

const serverUrl = 'some.server.url';
jest.mock('@context/server', () => ({
    useServerUrl: jest.fn().mockReturnValue(serverUrl),
}));
jest.mock('@screens/navigation');
jest.mock('@actions/remote/user');

jest.mock('@components/button', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(Button).mockImplementation(
    (props) => React.createElement('Button', {testID: 'button', ...props}),
);

jest.mock('@components/search', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(SearchBar).mockImplementation(
    (props) => React.createElement('SearchBar', {...props}),
);

jest.mock('@components/server_user_list', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(ServerUserList).mockImplementation(
    (props) => React.createElement('ServerUserList', {...props}),
);

describe('SelectUser', () => {
    let database: Database;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    function getBaseProps(): ComponentProps<typeof SelectUser> {
        return {
            currentTeamId: 'team-1',
            currentUserId: 'current-user',
            handleSelect: jest.fn(),
            componentId: 'PlaybookSelectUser',
            participantIds: ['participant-1', 'participant-2'],
        };
    }

    it('renders correctly with basic props', () => {
        const props = getBaseProps();
        const {getByTestId, queryByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const searchBar = getByTestId('selector.search_bar');
        expect(searchBar).toHaveProp('placeholder', 'Search');
        expect(searchBar).toHaveProp('onChangeText', expect.any(Function));
        expect(searchBar).toHaveProp('value', '');
        expect(searchBar).toHaveProp('autoCapitalize', 'none');

        expect(queryByTestId('button')).toBeNull();

        const userList = getByTestId('integration_selector.user_list');
        expect(userList).toHaveProp('currentUserId', props.currentUserId);
        expect(userList).toHaveProp('term', '');
        expect(userList).toHaveProp('tutorialWatched', true);
        expect(userList).toHaveProp('handleSelectProfile', expect.any(Function));
        expect(userList).toHaveProp('selectedIds', new Set(props.participantIds));
        expect(userList).toHaveProp('fetchFunction', expect.any(Function));
        expect(userList).toHaveProp('searchFunction', expect.any(Function));
        expect(userList).toHaveProp('createFilter', expect.any(Function));
        expect(userList).toHaveProp('location', Screens.PLAYBOOK_SELECT_USER);
        expect(userList).toHaveProp('customSection', expect.any(Function));
    });

    it('renders no assignee button when handleRemove is provided and no search term', () => {
        const props = getBaseProps();
        props.handleRemove = jest.fn();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const button = getByTestId('button');
        expect(button).toHaveProp('text', 'No Assignee');
        expect(button).toHaveProp('onPress', expect.any(Function));
        expect(button).toHaveProp('emphasis', 'link');
    });

    it('does not render no assignee button when search term is present', () => {
        const props = getBaseProps();
        props.handleRemove = jest.fn();
        const {queryByTestId, getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        expect(getByTestId('button')).toBeTruthy();

        const searchBar = getByTestId('selector.search_bar');
        act(() => {
            searchBar.props.onChangeText('test');
        });

        expect(queryByTestId('button')).toBeNull();
    });

    it('handles search term changes correctly', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const searchBar = getByTestId('selector.search_bar');
        act(() => {
            searchBar.props.onChangeText('test');
        });

        expect(searchBar).toHaveProp('value', 'test');

        const serverUserList = getByTestId('integration_selector.user_list');
        expect(serverUserList).toHaveProp('term', 'test');
    });

    it('clears search term when empty string is passed', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const searchBar = getByTestId('selector.search_bar');
        act(() => {
            searchBar.props.onChangeText('test');
        });

        expect(searchBar).toHaveProp('value', 'test');

        act(() => {
            searchBar.props.onChangeText('');
        });

        expect(searchBar).toHaveProp('value', '');
        const serverUserList = getByTestId('integration_selector.user_list');
        expect(serverUserList).toHaveProp('term', '');
    });

    it('handles profile selection correctly', () => {
        const props = getBaseProps();
        const mockUser = TestHelper.fakeUser({id: 'user-1'});
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        serverUserList.props.handleSelectProfile(mockUser);

        expect(props.handleSelect).toHaveBeenCalledWith(mockUser);
        expect(popTopScreen).toHaveBeenCalled();
    });

    it('handles remove action correctly', () => {
        const props = getBaseProps();
        props.handleRemove = jest.fn();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const button = getByTestId('button');
        button.props.onPress();

        expect(props.handleRemove).toHaveBeenCalled();
        expect(props.handleSelect).not.toHaveBeenCalled();
        expect(popTopScreen).toHaveBeenCalled();
    });

    it('creates empty selectedIds set when selected prop is not provided', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        expect(serverUserList).toHaveProp('selectedIds', new Set());
    });

    it('provides correct fetch function for profiles in team', async () => {
        const props = getBaseProps();
        const mockUsers = [TestHelper.fakeUser({id: 'user-1'})];
        jest.mocked(fetchProfilesInTeam).mockResolvedValue({users: mockUsers});

        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        const result = await serverUserList.props.fetchFunction(1);

        expect(fetchProfilesInTeam).toHaveBeenCalledWith(
            serverUrl,
            props.currentTeamId,
            1,
            General.PROFILE_CHUNK_SIZE,
            undefined,
            {active: true},
        );
        expect(result).toEqual(mockUsers);
    });

    it('provides correct search function for profiles', async () => {
        const props = getBaseProps();
        const mockUsers = [TestHelper.fakeUser({id: 'user-1'})];
        jest.mocked(searchProfiles).mockResolvedValue({data: mockUsers});

        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        const result = await serverUserList.props.searchFunction('test');

        expect(searchProfiles).toHaveBeenCalledWith(
            serverUrl,
            'test',
            {team_id: props.currentTeamId, allow_inactive: false},
        );
        expect(result).toEqual(mockUsers);
    });

    it('returns empty array when fetchProfilesInTeam returns no users', async () => {
        const props = getBaseProps();
        jest.mocked(fetchProfilesInTeam).mockResolvedValue({users: []});

        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        const result = await serverUserList.props.fetchFunction(1);

        expect(result).toEqual([]);
    });

    it('returns empty array when searchProfiles returns no data', async () => {
        const props = getBaseProps();
        jest.mocked(searchProfiles).mockResolvedValue({data: []});

        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        const result = await serverUserList.props.searchFunction('test');

        expect(result).toEqual([]);
    });

    it('creates user filter that prioritizes exact username matches', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        const createFilter = serverUserList.props.createFilter;
        const exactMatches: UserProfile[] = [];
        const filter = createFilter(exactMatches, 'test');

        const user1 = TestHelper.fakeUser({username: 'test'});
        const user2 = TestHelper.fakeUser({username: 'testuser'});
        const user3 = TestHelper.fakeUser({username: 'other'});

        expect(filter(user1)).toBe(false);
        expect(filter(user2)).toBe(false);
        expect(filter(user3)).toBe(true);

        expect(exactMatches).toContain(user1);
        expect(exactMatches).toContain(user2);
        expect(exactMatches).not.toContain(user3);
    });

    it('creates custom sections for participants and non-participants', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        const customSection = serverUserList.props.customSection;

        const participantUser = TestHelper.fakeUser({id: 'participant-1'});
        const nonParticipantUser = TestHelper.fakeUser({id: 'non-participant'});
        const profiles = [nonParticipantUser, participantUser];

        const sections = customSection(profiles);

        expect(sections).toHaveLength(2);
        expect(sections[0].id).toBe('RUN PARTICIPANTS');
        expect(sections[0].data).toContain(participantUser);
        expect(sections[1].id).toBe('NOT PARTICIPATING');
        expect(sections[1].data).toContain(nonParticipantUser);
    });

    it('returns empty array when no profiles provided to custom section', () => {
        const props = getBaseProps();
        const {getByTestId} = renderWithEverything(<SelectUser {...props}/>, {database});

        const serverUserList = getByTestId('integration_selector.user_list');
        const customSection = serverUserList.props.customSection;

        const sections = customSection([]);

        expect(sections).toEqual([]);
    });
});
