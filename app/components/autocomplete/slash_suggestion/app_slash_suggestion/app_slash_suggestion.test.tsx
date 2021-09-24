// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';
import {intl} from 'test/intl-test-helper';

import Preferences from '@mm-redux/constants/preferences';
import {AutocompleteSuggestion} from '@mm-redux/types/integrations';
import Store from '@store/store';

import {
    reduxTestState,
    testBindings,
} from '../app_command_parser/tests/app_command_parser_test_data';
import {
    thunk,
    configureStore,
    Client4,
    AppBinding,
} from '../app_command_parser/tests/app_command_parser_test_dependencies';

const mockStore = configureStore([thunk]);

const makeStore = async (bindings: AppBinding[]) => {
    const initialState = {
        ...reduxTestState,
        entities: {
            ...reduxTestState.entities,
            apps: {
                bindings,
                bindingsForms: {},
                threadBindings: bindings,
                threadBindingsForms: {},
            },
        },
    } as any;
    const testStore = await mockStore(initialState);

    return testStore;
};

import SlashSuggestion, {Props} from './app_slash_suggestion';

describe('components/autocomplete/app_slash_suggestion', () => {
    const baseProps: Props = {
        currentTeamId: '',
        isSearch: false,
        maxListHeight: 50,
        theme: Preferences.THEMES.denim,
        onChangeText: jest.fn(),
        onResultCountChange: jest.fn(),
        value: '',
        nestedScrollEnabled: false,
        rootId: '',
        channelId: 'thechannel',
        appsEnabled: true,
    };

    const f = Client4.getServerVersion;

    beforeAll(async () => {
        Client4.getServerVersion = jest.fn().mockReturnValue('5.30.0');

        const store = await makeStore(testBindings);
        Store.redux = store;
    });

    afterAll(() => {
        Client4.getServerVersion = f;
    });

    test('should match snapshot', () => {
        const props: Props = {
            ...baseProps,
        };

        const wrapper = shallow(
            <SlashSuggestion {...props}/>,
            {context: {intl}},
        );

        const dataSource: AutocompleteSuggestion[] = [
            {
                Complete: 'thetrigger',
                Description: 'The Description',
                Hint: 'The Hint',
                IconData: 'iconurl.com',
                Suggestion: '/thetrigger',
            },
        ];
        wrapper.setState({active: true, dataSource, lastCommandRequest: 1234});

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should not show commands from app base commands', async () => {
        const props: Props = {
            ...baseProps,
        };

        const wrapper = shallow<SlashSuggestion>(
            <SlashSuggestion {...props}/>,
            {context: {intl}},
        );
        wrapper.setProps({value: '/ji'});

        expect(wrapper.state('dataSource')).toEqual([]);
    });

    test('should show commands from app sub commands', (done?: jest.DoneCallback) => {
        const props: Props = {
            ...baseProps,
        };

        const wrapper = shallow<SlashSuggestion>(
            <SlashSuggestion {...props}/>,
            {context: {intl}},
        );
        wrapper.setProps({value: '/jira i'});

        const expected: AutocompleteSuggestion[] = [
            {
                Complete: 'jira issue',
                Description: 'Interact with Jira issues',
                Hint: 'Issue hint',
                IconData: 'Issue icon',
                Suggestion: 'issue',
            },
        ];

        setTimeout(() => {
            expect(wrapper.state('dataSource')).toEqual(expected);
            if (done) {
                done();
            }
        });
    });

    test('should avoid using app commands when apps are disabled', async () => {
        const props: Props = {
            ...baseProps,
            appsEnabled: false,
        };

        const wrapper = shallow<SlashSuggestion>(
            <SlashSuggestion {...props}/>,
            {context: {intl}},
        );
        wrapper.setProps({value: '/jira i'});

        expect(wrapper.state('dataSource')).toEqual([]);
    });
});
