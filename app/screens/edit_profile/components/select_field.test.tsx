// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import SelectField from './select_field';

import type {SelectFieldProps} from '@typings/screens/edit_profile';

// Mock the AutocompleteSelector component to avoid complex dependencies
jest.mock('@components/autocomplete_selector', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const MockAutocompleteSelector = jest.requireMock('@components/autocomplete_selector').default;
MockAutocompleteSelector.mockImplementation((props: any) =>
    React.createElement('AutocompleteSelector', {...props}),
);

// Mock the useIsTablet hook
jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(() => false),
}));

describe('SelectField', () => {
    const mockOptions: DialogOption[] = [
        {value: 'option1', text: 'Option 1'},
        {value: 'option2', text: 'Option 2'},
        {value: 'option3', text: 'Option 3'},
    ];

    const baseProps: SelectFieldProps = {
        fieldKey: 'test_field',
        label: 'Test Field',
        value: '',
        options: mockOptions,
        isDisabled: false,
        onValueChange: jest.fn(),
        onFocusNextField: jest.fn(),
        testID: 'test_field',
        isOptional: false,
        isMultiselect: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render correctly with basic props', () => {
            renderWithIntl(<SelectField {...baseProps}/>);

            expect(screen.getByTestId('test_field')).toBeTruthy();
            expect(screen.getByTestId('test_field.selector')).toBeTruthy();
        });
    });

    describe('Single Select Mode', () => {
        it('should pass correct props for single select mode', () => {
            const props = {...baseProps, value: 'option1'};
            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');
            expect(selector.props.selected).toBe('option1');
            expect(selector.props.isMultiselect).toBe(false);
        });

        it('should pass value as selected prop to AutocompleteSelector', () => {
            const props = {...baseProps, value: 'test_value'};
            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');
            expect(selector.props.selected).toBe('test_value');
        });
    });

    describe('Multiselect Mode', () => {
        it('should pass correct props for multiselect mode', () => {
            const props = {
                ...baseProps,
                isMultiselect: true,
                value: '["option1", "option2"]',
            };
            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');
            expect(selector.props.isMultiselect).toBe(true);
            expect(selector.props.selected).toEqual(['option1', 'option2']);
        });

        it('should handle empty multiselect value', () => {
            const props = {...baseProps, isMultiselect: true, value: ''};
            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');
            expect(selector.props.selected).toEqual([]);
        });

    });

    describe('Disabled State', () => {
        it('should pass disabled prop to AutocompleteSelector', () => {
            const props = {
                ...baseProps,
                isDisabled: true,
            };

            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');
            expect(selector.props.disabled).toBe(true);
        });
    });

    describe('Tablet Layout', () => {
        it('should apply tablet styles when on tablet', () => {
            const {useIsTablet} = require('@hooks/device');
            useIsTablet.mockReturnValue(true);

            renderWithIntl(<SelectField {...baseProps}/>);

            const container = screen.getByTestId('test_field');
            expect(container.props.style).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        paddingHorizontal: 20,
                    }),
                    expect.objectContaining({
                        paddingHorizontal: 42,
                    }),
                ]),
            );
        });

        it('should not apply tablet styles when not on tablet', () => {
            const {useIsTablet} = require('@hooks/device');
            useIsTablet.mockReturnValue(false);

            renderWithIntl(<SelectField {...baseProps}/>);

            const container = screen.getByTestId('test_field');
            expect(container.props.style).not.toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        paddingHorizontal: 42,
                    }),
                ]),
            );
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty options array', () => {
            const props = {...baseProps, options: []};
            renderWithIntl(<SelectField {...props}/>);

            expect(screen.getByTestId('test_field')).toBeTruthy();
        });

        it('should handle undefined value', () => {
            const props = {...baseProps, value: undefined as any};
            renderWithIntl(<SelectField {...props}/>);

            expect(screen.getByTestId('test_field')).toBeTruthy();
        });

        it('should handle null value', () => {
            const props = {...baseProps, value: null as any};
            renderWithIntl(<SelectField {...props}/>);

            expect(screen.getByTestId('test_field')).toBeTruthy();
        });
    });

    describe('Props Forwarding', () => {
        it('should forward all props to AutocompleteSelector correctly', () => {
            const onValueChange = jest.fn();
            const onFocusNextField = jest.fn();
            const props = {
                ...baseProps,
                isDisabled: true,
                isMultiselect: true,
                isOptional: true,
                onValueChange,
                onFocusNextField,
            };

            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');

            // Verify basic props
            expect(selector.props.testID).toBe('test_field.selector');
            expect(selector.props.label).toBe('Test Field (optional)');
            expect(selector.props.placeholder).toBe('Select one or more options');
            expect(selector.props.disabled).toBe(true);
            expect(selector.props.isMultiselect).toBe(true);
            expect(selector.props.options).toBe(mockOptions);

            // Verify callback props are functions
            expect(typeof selector.props.onSelected).toBe('function');
        });

        it('should handle onSelected callback for single select', () => {
            const onValueChange = jest.fn();
            const onFocusNextField = jest.fn();
            const props = {...baseProps, onValueChange, onFocusNextField};

            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');

            // Simulate AutocompleteSelector calling onSelected
            selector.props.onSelected({value: 'test_value', text: 'Test Option'});

            expect(onValueChange).toHaveBeenCalledWith('test_field', 'test_value');
            expect(onFocusNextField).toHaveBeenCalledWith('test_field');
        });

        it('should handle onSelected callback for multiselect', () => {
            const onValueChange = jest.fn();
            const onFocusNextField = jest.fn();
            const props = {
                ...baseProps,
                isMultiselect: true,
                onValueChange,
                onFocusNextField,
            };

            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');

            // Simulate AutocompleteSelector calling onSelected with array
            const selectedOptions = [{value: 'option1', text: 'Option 1'}, {value: 'option2', text: 'Option 2'}];
            selector.props.onSelected(selectedOptions);

            expect(onValueChange).toHaveBeenCalledWith('test_field', '["option1","option2"]');
            expect(onFocusNextField).toHaveBeenCalledWith('test_field');
        });

        it('should handle onSelected callback with null (clear selection)', () => {
            const onValueChange = jest.fn();
            const props = {...baseProps, onValueChange};

            renderWithIntl(<SelectField {...props}/>);

            const selector = screen.getByTestId('test_field.selector');

            // Simulate AutocompleteSelector calling onSelected with null
            selector.props.onSelected(null);

            expect(onValueChange).toHaveBeenCalledWith('test_field', '');
        });
    });
});
