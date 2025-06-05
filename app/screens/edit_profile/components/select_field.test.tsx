// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntl} from '@test/intl-test-helper';

import SelectField from './select_field';

import type {SelectFieldProps} from '@typings/screens/edit_profile';

// Mock the AutocompleteSelector component to avoid complex dependencies
jest.mock('@components/autocomplete_selector', () => {
    const {View, Text, TouchableOpacity} = require('react-native');

    return function MockAutocompleteSelector(props: any) {
        const handlePress = () => {
            if (props.onSelected && !props.disabled) {
                // Mock different behaviors based on props
                if (props.isMultiselect) {
                    // Mock multiselect behavior
                    const newSelection = [{value: 'option1', text: 'Option 1'}, {value: 'option2', text: 'Option 2'}];
                    props.onSelected(newSelection);
                } else {
                    // Mock single select behavior
                    props.onSelected({value: 'test_value', text: 'Test Option'});
                }
            }
        };

        const handleClear = () => {
            if (props.onSelected && !props.disabled) {
                props.onSelected(null);
            }
        };

        // Determine if we should show the selected element
        const hasSelection = props.selected && (
            (Array.isArray(props.selected) && props.selected.length > 0) ||
            (!Array.isArray(props.selected) && props.selected)
        );

        return (
            <View testID={props.testID}>
                <Text testID={`${props.testID}.label`}>{props.label}</Text>
                <Text testID={`${props.testID}.placeholder`}>{props.placeholder}</Text>
                <TouchableOpacity
                    testID={`${props.testID}.button`}
                    onPress={handlePress}
                    disabled={props.disabled}
                />
                <TouchableOpacity
                    testID={`${props.testID}.clear`}
                    onPress={handleClear}
                    disabled={props.disabled}
                />
                {hasSelection && (
                    <Text testID={`${props.testID}.selected`}>
                        {Array.isArray(props.selected) ? props.selected.join(', ') : props.selected}
                    </Text>
                )}
            </View>
        );
    };
});

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
            expect(screen.getByTestId('test_field.selector.label')).toBeTruthy();
        });

        it('should display the correct label', () => {
            renderWithIntl(<SelectField {...baseProps}/>);

            const label = screen.getByTestId('test_field.selector.label');
            expect(label.props.children).toBe('Test Field');
        });

        it('should display optional text when isOptional is true', () => {
            const props = {...baseProps, isOptional: true};
            renderWithIntl(<SelectField {...props}/>);

            expect(screen.getByText('(optional)')).toBeTruthy();
        });

        it('should display placeholder text', () => {
            renderWithIntl(<SelectField {...baseProps}/>);

            const placeholder = screen.getByTestId('test_field.selector.placeholder');
            expect(placeholder.props.children).toBe('Select an option');
        });
    });

    describe('Single Select Mode', () => {
        it('should handle single select value correctly', () => {
            const props = {...baseProps, value: 'option1'};
            renderWithIntl(<SelectField {...props}/>);

            const selected = screen.getByTestId('test_field.selector.selected');
            expect(selected.props.children).toBe('option1');
        });

        it('should call onValueChange with single value when option is selected', () => {
            const onValueChange = jest.fn();
            const onFocusNextField = jest.fn();
            const props = {...baseProps, onValueChange, onFocusNextField};

            renderWithIntl(<SelectField {...props}/>);

            fireEvent.press(screen.getByTestId('test_field.selector.button'));

            expect(onValueChange).toHaveBeenCalledWith('test_field', 'test_value');
            expect(onFocusNextField).toHaveBeenCalledWith('test_field');
        });

        it('should clear value when selection is cleared', () => {
            const onValueChange = jest.fn();
            const props = {...baseProps, onValueChange, value: 'option1'};

            renderWithIntl(<SelectField {...props}/>);

            fireEvent.press(screen.getByTestId('test_field.selector.clear'));

            expect(onValueChange).toHaveBeenCalledWith('test_field', '');
        });
    });

    describe('Multiselect Mode', () => {
        it('should handle multiselect value correctly', () => {
            const props = {
                ...baseProps,
                isMultiselect: true,
                value: '["option1", "option2"]',
            };
            renderWithIntl(<SelectField {...props}/>);

            const selected = screen.getByTestId('test_field.selector.selected');
            expect(selected.props.children).toBe('option1, option2');
        });

        it('should call onValueChange with JSON string when multiselect options are selected', () => {
            const onValueChange = jest.fn();
            const onFocusNextField = jest.fn();
            const props = {
                ...baseProps,
                isMultiselect: true,
                onValueChange,
                onFocusNextField,
            };

            renderWithIntl(<SelectField {...props}/>);

            fireEvent.press(screen.getByTestId('test_field.selector.button'));

            expect(onValueChange).toHaveBeenCalledWith('test_field', '["option1","option2"]');
            expect(onFocusNextField).toHaveBeenCalledWith('test_field');
        });

        it('should handle empty multiselect value', () => {
            const props = {...baseProps, isMultiselect: true, value: ''};
            renderWithIntl(<SelectField {...props}/>);

            expect(screen.queryByTestId('test_field.selector.selected')).toBeNull();
        });

        it('should handle invalid JSON in multiselect value', () => {
            const props = {...baseProps, isMultiselect: true, value: 'invalid_json'};
            renderWithIntl(<SelectField {...props}/>);

            // Should gracefully handle invalid JSON and not crash
            expect(screen.getByTestId('test_field')).toBeTruthy();
        });
    });

    describe('Disabled State', () => {
        it('should not trigger callbacks when disabled', () => {
            const onValueChange = jest.fn();
            const onFocusNextField = jest.fn();
            const props = {
                ...baseProps,
                isDisabled: true,
                onValueChange,
                onFocusNextField,
            };

            renderWithIntl(<SelectField {...props}/>);

            fireEvent.press(screen.getByTestId('test_field.selector.button'));

            expect(onValueChange).not.toHaveBeenCalled();
            expect(onFocusNextField).not.toHaveBeenCalled();
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
            const props = {
                ...baseProps,
                isDisabled: true,
                isMultiselect: true,
                isOptional: true,
            };

            renderWithIntl(<SelectField {...props}/>);

            // Verify the selector receives the correct testID format
            expect(screen.getByTestId('test_field.selector')).toBeTruthy();

            // Verify label formatting with optional text
            const label = screen.getByTestId('test_field.selector.label');
            expect(label.props.children).toContain('(optional)');
        });

        it('should use correct placeholder text', () => {
            renderWithIntl(<SelectField {...baseProps}/>);

            const placeholder = screen.getByTestId('test_field.selector.placeholder');
            expect(placeholder.props.children).toBe('Select an option');
        });
    });
});
