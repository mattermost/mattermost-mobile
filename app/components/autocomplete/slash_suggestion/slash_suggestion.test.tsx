// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';
import {Command, AutocompleteSuggestion} from '@mm-redux/types/integrations';

import Store from '@store/store';

import {
    thunk,
    configureStore,
    Client4,
    AppBinding,
} from './app_command_parser/app_command_parser_test_dependencies';

import {
    reduxTestState,
    definitions,
} from './app_command_parser/test_data';

const mockStore = configureStore([thunk]);

const makeStore = async (bindings: AppBinding[]) => {
    const initialState = {
        ...reduxTestState,
        entities: {
            ...reduxTestState.entities,
            apps: {bindings},
        },
    } as any;
    const testStore = await mockStore(initialState);

    return testStore;
};

import SlashSuggestion, {Props} from './slash_suggestion';

describe('components/autocomplete/slash_suggestion', () => {
    const baseProps: Props = {
        actions: {
            getAutocompleteCommands: jest.fn(),
            getCommandAutocompleteSuggestions: jest.fn(),
        },
        currentTeamId: '',
        commands: [],
        isSearch: false,
        maxListHeight: 50,
        theme: Preferences.THEMES.default,
        onChangeText: jest.fn(),
        onResultCountChange: jest.fn(),
        value: '',
        nestedScrollEnabled: false,
        suggestions: [],
        rootId: '',
        channelId: 'thechannel',
    };

    const f = Client4.getServerVersion;
    beforeAll(() => {
        Client4.getServerVersion = jest.fn().mockReturnValue('5.30.0');
    });

    afterAll(() => {
        Client4.getServerVersion = f;
    });

    test('should match snapshot', () => {
        const wrapper = shallow(<SlashSuggestion {...baseProps}/>);
        wrapper.setState({active: true});
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.state('dataSource')).toEqual([]);
    });

    test('should show commands from props.commands', async () => {
        const sampleCommand = {
            trigger: 'thetrigger',
            auto_complete: true,
            auto_complete_desc: 'The Description',
            auto_complete_hint: 'The Hint',
            display_name: 'The Display Name',
        } as Command;

        const props: Props = {
            ...baseProps,
            commands: [
                sampleCommand,
            ],
        };

        const store = await makeStore(definitions);
        Store.redux = store;

        const wrapper = shallow<SlashSuggestion>(<SlashSuggestion {...props}/>);

        wrapper.setProps({value: '/the'});

        const expected: AutocompleteSuggestion[] = [
            {
                Complete: 'thetrigger',
                Description: 'The Description',
                Hint: 'The Hint',
                IconData: '',
                Suggestion: '/thetrigger',
            },
        ]
        expect(wrapper.state('dataSource')).toEqual(expected);
    });

    test('should show commands from app base commands', async () => {
        const props: Props = {
            ...baseProps,
        };

        const store = await makeStore(definitions);
        Store.redux = store;

        const wrapper = shallow<SlashSuggestion>(<SlashSuggestion {...props}/>);
        wrapper.setProps({value: '/jir'});

        const expected: AutocompleteSuggestion[] = [
            {
                Complete: 'jira',
                Description: 'Interact with Jira',
                Hint: 'Jira hint',
                IconData: 'Jira icon',
                Suggestion: '/jira',
            },
        ]
        expect(wrapper.state('dataSource')).toEqual(expected);
    });

    test('should show commands from app base commands and regular commands', async () => {
        const sampleCommand = {
            trigger: 'jiro',
            auto_complete: true,
            auto_complete_desc: 'The Jiro Description',
            auto_complete_hint: 'The Jiro Hint',
            display_name: 'The Jiro Display Name',
        } as Command;

        const props: Props = {
            ...baseProps,
            commands: [
                sampleCommand,
            ],
        };

        const store = await makeStore(definitions);
        // reduxStore.getState.mockImplementation(store.getState);
        // ReduxStore.redux.getState = store.getState;

        Store.redux = store;

        const wrapper = shallow<SlashSuggestion>(<SlashSuggestion {...props}/>);
        wrapper.setProps({value: '/'});

        let expected: AutocompleteSuggestion[] = [
            {
                Complete: 'jira',
                Description: 'Interact with Jira',
                Hint: 'Jira hint',
                IconData: 'Jira icon',
                Suggestion: '/jira',
            },
            {
                Complete: 'jiro',
                Description: 'The Jiro Description',
                Hint: 'The Jiro Hint',
                IconData: '',
                Suggestion: '/jiro',
            },
            {
                Complete: 'other',
                Description: '',
                Hint: '',
                IconData: '',
                Suggestion: '/other',
            },
        ]
        expect(wrapper.state('dataSource')).toEqual(expected);

        expected = [
            {
                Complete: 'jira',
                Description: 'Interact with Jira',
                Hint: 'Jira hint',
                IconData: 'Jira icon',
                Suggestion: '/jira',
            },
            {
                Complete: 'jiro',
                Description: 'The Jiro Description',
                Hint: 'The Jiro Hint',
                IconData: '',
                Suggestion: '/jiro',
            },
        ]

        wrapper.setProps({value: '/jir'});
        expect(wrapper.state('dataSource')).toEqual(expected);
    });

    test('should show commands from app sub commands', async (done) => {
        const props: Props = {
            ...baseProps,
        };

        const store = await makeStore(definitions);
        // ReduxStore.redux.getState = store.getState;

        Store.redux = store;

        const wrapper = shallow<SlashSuggestion>(<SlashSuggestion {...props}/>);
        wrapper.setProps({value: '/jira i'});

        const expected: AutocompleteSuggestion[] = [
            {
                Complete: '/jira issue',
                Description: 'Interact with Jira issues',
                Hint: '',
                IconData: '',
                Suggestion: '/issue',
            },
        ];

        setTimeout(() => {
            expect(wrapper.state('dataSource')).toEqual(expected);
            done();
        });
    });
});
