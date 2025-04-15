// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {of as of$} from 'rxjs';

import TeamList from './team_list';

import TeamListWrapper from './';

// Mock database queries
jest.mock('@queries/servers/team', () => {
    const {of} = require('rxjs');
    return {
        queryMyTeams: jest.fn(() => of([])),
        queryJoinedTeams: jest.fn(() => ({
            observe: jest.fn(() => of([])),
        })),
    };
});

jest.mock('@queries/servers/preference', () => {
    const {of} = require('rxjs');
    return {
        queryPreferencesByCategoryAndName: jest.fn(() => ({
            observe: jest.fn(() => of([])),
            observeWithColumns: jest.fn(() => of([])),
        })),
    };
});

const {queryPreferencesByCategoryAndName} = require('@queries/servers/preference');
const {queryMyTeams, queryJoinedTeams} = require('@queries/servers/team');

// Mock WatermelonDB HOCs
jest.mock('@nozbe/watermelondb/react', () => ({
    withDatabase: jest.fn((Component) => Component),
    withObservables: jest.fn((_, observableMapper) => {
        // eslint-disable-next-line react/display-name
        return (Component: any) => (props: any) => {
            const observables = observableMapper(props);
            const mockedProps: Record<string, any> = {};
            // eslint-disable-next-line guard-for-in
            for (const key in observables) {
                observables[key].subscribe((value: any) => {
                    mockedProps[key] = value;
                });
            }
            return (
                <Component
                    {...props}
                    {...mockedProps}
                />);
        };
    }),
}));

jest.mock('./team_list', () => {
    return jest.fn(() => null); // Mock implementation for TeamList
});

describe('withTeams HOC', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle valid data correctly', async () => {
        queryMyTeams.mockReturnValue({
            observe: jest.fn(() => of$([{id: '1', roles: 'team_user'}])),
        });

        queryJoinedTeams.mockReturnValue({
            observe: jest.fn(() => of$([
                {id: '1', displayName: 'Team 1'},
                {id: '2', displayName: 'Team 2'},
            ])),
        });

        queryPreferencesByCategoryAndName.mockReturnValue({
            observeWithColumns: jest.fn(() => of$([{value: '1,2'}])),
        });

        render(<TeamListWrapper/>);

        await waitFor(() => {
            expect(TeamList).toHaveBeenCalledWith(
                expect.objectContaining({
                    myOrderedTeams: [{id: '1', roles: 'team_user'}],
                }),
                expect.anything(),
            );
        });
    });

    it('should handle missing team IDs gracefully', async () => {
        queryMyTeams.mockReturnValue({
            observe: jest.fn(() => of$([{id: '1', roles: 'team_user'}])),
        });

        queryJoinedTeams.mockReturnValue({
            observe: jest.fn(() => of$([
                {id: '1', displayName: 'Team 1'},
                {id: undefined, displayName: 'Team 2'},
            ])),
        });

        queryPreferencesByCategoryAndName.mockReturnValue({
            observeWithColumns: jest.fn(() => of$([{value: '1,2'}])),
        });

        render(<TeamListWrapper/>);

        await waitFor(() => {
            expect(TeamList).toHaveBeenCalledWith(
                expect.objectContaining({
                    myOrderedTeams: [{id: '1', roles: 'team_user'}],
                }),
                expect.anything(),
            );
        });
    });

    it('should handle empty team order preferences gracefully', async () => {
        queryMyTeams.mockReturnValue({
            observe: jest.fn(() => of$([{id: '1', roles: 'team_user'}])),
        });

        queryJoinedTeams.mockReturnValue({
            observe: jest.fn(() => of$([
                {id: '1', displayName: 'Team 1'},
                {id: '2', displayName: 'Team 2'},
            ])),
        });

        queryPreferencesByCategoryAndName.mockReturnValue({
            observeWithColumns: jest.fn(() => of$([])),
        });

        render(<TeamListWrapper/>);

        await waitFor(() => {
            expect(TeamList).toHaveBeenCalledWith(
                expect.objectContaining({
                    myOrderedTeams: [{id: '1', roles: 'team_user'}],
                }),
                expect.anything(),
            );
        });
    });

    it('should handle undefined in team order preferences gracefully', async () => {
        queryMyTeams.mockReturnValue({
            observe: jest.fn(() => of$([
                {id: '1', roles: 'team_user'},
                {id: '2', roles: 'team_user'},
            ])),
        });

        queryJoinedTeams.mockReturnValue({
            observe: jest.fn(() => of$([
                {id: '1', displayName: 'Team 1'},
                {id: '2', displayName: 'Team 2'},
            ])),
        });

        queryPreferencesByCategoryAndName.mockReturnValue({
            observeWithColumns: jest.fn(() => of$([{value: '1,,2'}])),
        });

        render(<TeamListWrapper/>);

        await waitFor(() => {
            expect(TeamList).toHaveBeenCalledWith(
                expect.objectContaining({
                    myOrderedTeams: [
                        {id: '1', roles: 'team_user'},
                        {id: '2', roles: 'team_user'},
                    ],
                }),
                expect.anything(),
            );
        });
    });

    it('should handle wrong data in team order preferences gracefully', async () => {
        queryMyTeams.mockReturnValue({
            observe: jest.fn(() => of$([
                {id: '1', roles: 'team_user'},
                {id: '2', roles: 'team_user'},
            ])),
        });

        queryJoinedTeams.mockReturnValue({
            observe: jest.fn(() => of$([
                {id: '1', displayName: 'Team 1'},
                {id: '2', displayName: 'Team 2'},
            ])),
        });

        queryPreferencesByCategoryAndName.mockReturnValue({
            observeWithColumns: jest.fn(() => of$([{value: '1,undefined,2'}])),
        });

        render(<TeamListWrapper/>);

        await waitFor(() => {
            expect(TeamList).toHaveBeenCalledWith(
                expect.objectContaining({
                    myOrderedTeams: [
                        {id: '1', roles: 'team_user'},
                        {id: '2', roles: 'team_user'},
                    ],
                }),
                expect.anything(),
            );
        });
    });

    it('should handle empty teams list gracefully', async () => {
        queryMyTeams.mockReturnValue({
            observe: jest.fn(() => of$([])),
        });

        queryJoinedTeams.mockReturnValue({
            observe: jest.fn(() => of$([])),
        });

        queryPreferencesByCategoryAndName.mockReturnValue({
            observeWithColumns: jest.fn(() => of$([])),
        });

        render(<TeamListWrapper/>);
        await waitFor(() => {
            expect(TeamList).toHaveBeenCalledWith(
                expect.objectContaining({
                    myOrderedTeams: [],
                }),
                expect.anything(),
            );
        });
    });
});
