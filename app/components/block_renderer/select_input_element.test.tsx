// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps, type ReactNode} from 'react';

import AutocompleteSelector from '@components/autocomplete_selector';
import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {MmBlocksInteractionsDisabledContext, MmBlocksLookupContext} from './context';
import {MmBlocksForm} from './form';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';
import {SelectInputElement} from './select_input_element';

import type {LookupHandler} from './types';

jest.mock('@components/autocomplete_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const TEST_ID = 'mm_blocks.select_input.choice';

describe('SelectInputElement', () => {
    const onAction = jest.fn();
    const onLookup: jest.MockedFunction<LookupHandler> = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(AutocompleteSelector).mockImplementation((props: ComponentProps<typeof AutocompleteSelector>) =>
            React.createElement('AutocompleteSelector', props),
        );
    });

    function getBaseProps(): ComponentProps<typeof SelectInputElement> {
        return {
            element: {
                type: 'select',
                name: 'choice',
                label: 'Choice',
                options: [
                    {text: 'Alpha', value: 'a'},
                    {text: 'Beta', value: 'b'},
                ],
                initial_option: 'a',
            },
            onAction,
        };
    }

    function renderSelect(props: ComponentProps<typeof SelectInputElement>, wrap: (children: ReactNode) => ReactNode = (children) => children) {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
            >
                <MmBlocksForm
                    errors={{}}
                    onErrorsChange={jest.fn()}
                >
                    {wrap(<SelectInputElement {...props}/>)}
                </MmBlocksForm>
            </MmBlocksContextProvider>,
        );
    }

    it('should return null when name is missing', () => {
        const {toJSON} = renderSelect({
            ...getBaseProps(),
            element: {...getBaseProps().element, name: ''},
        });

        expect(toJSON()).toBeNull();
    });

    it('should return null when there are no static or dynamic options', () => {
        const {toJSON} = renderSelect({
            ...getBaseProps(),
            element: {type: 'select', name: 'choice', label: 'Choice'},
        });

        expect(toJSON()).toBeNull();
    });

    it('should flatten option groups into a single option list', () => {
        const {getByTestId} = renderSelect({
            ...getBaseProps(),
            element: {
                type: 'select',
                name: 'choice',
                label: 'Choice',
                option_groups: [
                    {label: 'Letters', options: [{text: 'Alpha', value: 'a'}]},
                    {label: 'More letters', options: [{text: 'Beta', value: 'b'}]},
                ],
            },
        });

        expect(getByTestId(TEST_ID)).toHaveProp('options', [
            {text: 'Alpha', value: 'a'},
            {text: 'Beta', value: 'b'},
        ]);
    });

    describe('single select', () => {
        it('should seed the initial option and commit the selected value', () => {
            const {getByTestId} = renderSelect(getBaseProps());

            expect(getByTestId(TEST_ID)).toHaveProp('selected', 'a');

            act(() => getByTestId(TEST_ID).props.onSelected({text: 'Beta', value: 'b'}));

            expect(getByTestId(TEST_ID)).toHaveProp('selected', 'b');
        });

        it('should clear the value when the selection is removed', () => {
            const {getByTestId} = renderSelect(getBaseProps());

            act(() => getByTestId(TEST_ID).props.onSelected(undefined));

            expect(getByTestId(TEST_ID)).toHaveProp('selected', '');
        });

        it('should trigger onAction with form values when onChange is set', () => {
            const {getByTestId} = renderSelect({
                ...getBaseProps(),
                element: {...getBaseProps().element, onChange: 'refresh_action'},
            });

            act(() => getByTestId(TEST_ID).props.onSelected({text: 'Beta', value: 'b'}));

            expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {choice: 'b'}});
        });
    });

    describe('multiselect', () => {
        function getMultiselectProps(): ComponentProps<typeof SelectInputElement> {
            return {
                ...getBaseProps(),
                element: {
                    ...getBaseProps().element,
                    initial_option: undefined,
                    initial_options: ['a'],
                    multiselect: true,
                },
            };
        }

        it('should seed the initial options and commit every selected value', () => {
            const {getByTestId} = renderSelect(getMultiselectProps());

            expect(getByTestId(TEST_ID)).toHaveProp('isMultiselect', true);
            expect(getByTestId(TEST_ID)).toHaveProp('selected', ['a']);

            act(() => getByTestId(TEST_ID).props.onSelected([{text: 'Alpha', value: 'a'}, {text: 'Beta', value: 'b'}]));

            expect(getByTestId(TEST_ID)).toHaveProp('selected', ['a', 'b']);
        });

        it('should clear every value when the selection is removed', () => {
            const {getByTestId} = renderSelect(getMultiselectProps());

            act(() => getByTestId(TEST_ID).props.onSelected(undefined));

            expect(getByTestId(TEST_ID)).toHaveProp('selected', []);
        });
    });

    describe('expanded style', () => {
        it('should render RadioSetting instead of AutocompleteSelector', () => {
            const {getByTestId} = renderSelect({
                ...getBaseProps(),
                element: {...getBaseProps().element, style: 'expanded'},
            });

            expect(getByTestId(`${TEST_ID}.radio.a.button`)).toBeTruthy();
            expect(jest.mocked(AutocompleteSelector)).not.toHaveBeenCalled();
        });

        it('should commit the value picked in the radio list', () => {
            const {getByTestId} = renderSelect({
                ...getBaseProps(),
                element: {...getBaseProps().element, style: 'expanded', onChange: 'refresh_action'},
            });

            fireEvent.press(getByTestId(`${TEST_ID}.radio.b.button`));

            expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {choice: 'b'}});
        });

        it('should render a checklist for expanded multiselect fields', () => {
            const {getByTestId} = renderSelect({
                ...getBaseProps(),
                element: {
                    ...getBaseProps().element,
                    style: 'expanded',
                    multiselect: true,
                    initial_option: undefined,
                    initial_options: ['a'],
                },
            });

            expect(getByTestId(`${TEST_ID}.check.a.button`)).toBeTruthy();
            expect(getByTestId(`${TEST_ID}.check.b.button`)).toBeTruthy();
            expect(jest.mocked(AutocompleteSelector)).not.toHaveBeenCalled();
        });

        it('should toggle checklist values for expanded multiselect fields', () => {
            const {getByTestId} = renderSelect({
                ...getBaseProps(),
                element: {
                    ...getBaseProps().element,
                    style: 'expanded',
                    multiselect: true,
                    initial_option: undefined,
                    initial_options: ['a'],
                    onChange: 'refresh_action',
                },
            });

            fireEvent.press(getByTestId(`${TEST_ID}.check.b.button`));

            expect(onAction).toHaveBeenCalledWith({
                actionId: 'refresh_action',
                formValues: {choice: ['a', 'b']},
            });
        });
    });

    describe('server-backed data sources', () => {
        it('should delegate to the users data source instead of static options', () => {
            const {getByTestId} = renderSelect({
                ...getBaseProps(),
                element: {type: 'select', name: 'choice', label: 'Choice', data_source: 'users'},
            });

            expect(getByTestId(TEST_ID)).toHaveProp('dataSource', 'users');
            expect(getByTestId(TEST_ID)).toHaveProp('options', undefined);
        });

        it('should delegate to the channels data source instead of static options', () => {
            const {getByTestId} = renderSelect({
                ...getBaseProps(),
                element: {type: 'select', name: 'choice', label: 'Choice', data_source: 'channels'},
            });

            expect(getByTestId(TEST_ID)).toHaveProp('dataSource', 'channels');
        });
    });

    describe('dynamic lookup', () => {
        function renderLookup(props: ComponentProps<typeof SelectInputElement>, interactionsDisabled = false) {
            return renderSelect(props, (children) => (
                <MmBlocksInteractionsDisabledContext.Provider value={interactionsDisabled}>
                    <MmBlocksLookupContext.Provider value={onLookup}>
                        {children}
                    </MmBlocksLookupContext.Provider>
                </MmBlocksInteractionsDisabledContext.Provider>
            ));
        }

        function getLookupProps(): ComponentProps<typeof SelectInputElement> {
            return {
                ...getBaseProps(),
                element: {
                    type: 'select',
                    name: 'choice',
                    label: 'Choice',
                    data_source: 'dynamic',
                    data_source_action: 'lookup_action',
                },
            };
        }

        it('should resolve options through the lookup handler', async () => {
            const items = [{text: 'Bug', value: 'bug'}];
            onLookup.mockResolvedValue(items);

            const {getByTestId} = renderLookup(getLookupProps());

            await expect(getByTestId(TEST_ID).props.getDynamicOptions('bu')).resolves.toEqual(items);
            expect(onLookup).toHaveBeenCalledWith('lookup_action', 'bu', {choice: ''});
            expect(getByTestId(TEST_ID)).toHaveProp('dataSource', 'dynamic');
        });

        it('should not look up options while interactions are disabled', async () => {
            const {getByTestId} = renderLookup(getLookupProps(), true);

            await expect(getByTestId(TEST_ID).props.getDynamicOptions()).resolves.toEqual([]);
            expect(onLookup).not.toHaveBeenCalled();
        });
    });
});
