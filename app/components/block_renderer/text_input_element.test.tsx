// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {Preferences, Screens} from '@constants';
import {navigateToScreen} from '@screens/navigation';
import CallbackStore from '@store/callback_store';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {MmBlocksForm} from './form';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';
import {TextInputElement} from './text_input_element';

jest.mock('@screens/navigation', () => ({
    navigateToScreen: jest.fn(),
}));

jest.mock('@store/callback_store', () => ({
    __esModule: true,
    default: {
        setCallback: jest.fn(),
    },
}));

jest.mock('@components/markdown', () => {
    const {Text} = require('react-native');
    const MockMarkdown = ({value}: {value: string}) => <Text>{value}</Text>;
    return MockMarkdown;
});

describe('TextInputElement', () => {
    const onAction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof TextInputElement> {
        return {
            element: {
                type: 'text_input',
                name: 'comment',
                label: 'Comment',
                initial_value: 'hello',
            },
            onAction,
            theme: Preferences.THEMES.denim,
        };
    }

    function renderInput(props: ComponentProps<typeof TextInputElement>, context: BlockActionContext = 'dialog') {
        return renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                context={context}
                location={Screens.CHANNEL}
                postId='post-id'
            >
                <MmBlocksForm
                    errors={{}}
                    onErrorsChange={jest.fn()}
                >
                    <TextInputElement {...props}/>
                </MmBlocksForm>
            </MmBlocksContextProvider>,
        );
    }

    function saveFromScreen(value: string) {
        const onSave = jest.mocked(CallbackStore.setCallback).mock.calls[0][0] as (next: string) => void;
        act(() => onSave(value));
    }

    it('should return null when name is missing', () => {
        const {toJSON} = renderInput({
            ...getBaseProps(),
            element: {type: 'text_input', name: '', label: 'Comment'},
        });

        expect(toJSON()).toBeNull();
    });

    describe('dialog context', () => {
        it('should seed the initial value and update on change', () => {
            const {getByTestId} = renderInput(getBaseProps());

            const input = getByTestId('mm_blocks.text_input.comment.input');
            expect(input.props.value).toBe('hello');

            fireEvent.changeText(input, 'updated');
            expect(input.props.value).toBe('updated');
        });

        it('should trigger onAction with form values when onChange is set', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {
                    type: 'text_input',
                    name: 'comment',
                    label: 'Comment',
                    initial_value: 'hello',
                    onChange: 'refresh_action',
                },
            });

            fireEvent.changeText(getByTestId('mm_blocks.text_input.comment.input'), 'updated');

            expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {comment: 'updated'}});
        });

        it('should store the number subtype as a number and display it as text', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {
                    type: 'text_input',
                    name: 'count',
                    label: 'Count',
                    subtype: 'number',
                    initial_value: '7',
                    onChange: 'refresh_action',
                },
            });

            const input = getByTestId('mm_blocks.text_input.count.input');
            expect(input.props.value).toBe('7');

            fireEvent.changeText(input, '0');
            expect(input.props.value).toBe('0');
            expect(onAction).toHaveBeenLastCalledWith({actionId: 'refresh_action', formValues: {count: 0}});

            fireEvent.changeText(input, '');

            // Cleared number fields are stored as null (display may still show initial_value).
            expect(onAction).toHaveBeenLastCalledWith({actionId: 'refresh_action', formValues: {count: null}});
        });

        it('should preserve invalid and in-progress number text for validation', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {
                    type: 'text_input',
                    name: 'count',
                    label: 'Count',
                    subtype: 'number',
                    onChange: 'refresh_action',
                },
            });

            const input = getByTestId('mm_blocks.text_input.count.input');

            fireEvent.changeText(input, '-');
            expect(input.props.value).toBe('-');
            expect(onAction).toHaveBeenLastCalledWith({actionId: 'refresh_action', formValues: {count: '-'}});

            fireEvent.changeText(input, 'not-a-number');
            expect(input.props.value).toBe('not-a-number');
            expect(onAction).toHaveBeenLastCalledWith({
                actionId: 'refresh_action',
                formValues: {count: 'not-a-number'},
            });
        });

        it('should keep multiline number fields as strings', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {
                    type: 'text_input',
                    name: 'count',
                    label: 'Count',
                    subtype: 'number',
                    multiline: true,
                    onChange: 'refresh_action',
                },
            });

            fireEvent.changeText(getByTestId('mm_blocks.text_input.count.input'), '42');

            expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {count: '42'}});
        });

        it('should cap single line fields at the default max length', () => {
            const {getByTestId} = renderInput(getBaseProps());

            const input = getByTestId('mm_blocks.text_input.comment.input');
            expect(input).toHaveProp('maxLength', 150);
            expect(input).toHaveProp('multiline', false);
        });

        it('should cap multiline fields at the larger default max length', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {type: 'text_input', name: 'comment', label: 'Comment', multiline: true, optional: true},
            });

            const input = getByTestId('mm_blocks.text_input.comment.input');
            expect(input).toHaveProp('maxLength', 3000);
            expect(input).toHaveProp('multiline', true);
        });

        it('should mask password fields without offering to save credentials', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {type: 'text_input', name: 'secret', label: 'Secret', subtype: 'password'},
            });

            const input = getByTestId('mm_blocks.text_input.secret.input');
            expect(input).toHaveProp('secureTextEntry', true);
            expect(input).toHaveProp('textContentType', 'oneTimeCode');
        });
    });

    describe('post context', () => {
        it('should render a tappable row instead of an inline input', () => {
            const {getByTestId, queryByTestId} = renderInput(getBaseProps(), 'post');

            expect(queryByTestId('mm_blocks.text_input.comment.input')).toBeNull();
            expect(getByTestId('mm_blocks.text_input.comment.edit.button')).toBeVisible();
        });

        it('should show the placeholder when there is no value', () => {
            const {getByText} = renderInput({
                ...getBaseProps(),
                element: {type: 'text_input', name: 'comment', label: 'Comment', placeholder: 'Add a comment'},
            }, 'post');

            expect(getByText('Add a comment')).toBeVisible();
        });

        it('should fall back to a generic placeholder when the field has neither value nor placeholder', () => {
            const {getByText} = renderInput({
                ...getBaseProps(),
                element: {type: 'text_input', name: 'comment', label: 'Comment'},
            }, 'post');

            expect(getByText('Enter text')).toBeVisible();
        });

        it('should mask the value for password fields', () => {
            const {getByText, queryByText} = renderInput({
                ...getBaseProps(),
                element: {type: 'text_input', name: 'secret', label: 'Secret', subtype: 'password', initial_value: 'abc'},
            }, 'post');

            expect(queryByText('abc')).toBeNull();
            expect(getByText('•••')).toBeVisible();
        });

        it('should open the text input screen with the current value', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {
                    type: 'text_input',
                    name: 'comment',
                    label: 'Comment',
                    initial_value: 'hello',
                    placeholder: 'Add a comment',
                    multiline: true,
                    max_length: 20,
                    subtype: 'text',
                    optional: true,
                    help_text: 'Be nice',
                },
            }, 'post');

            fireEvent.press(getByTestId('mm_blocks.text_input.comment.edit.button'));

            expect(navigateToScreen).toHaveBeenCalledWith(Screens.MM_BLOCKS_TEXT_INPUT, {
                title: 'Comment',
                label: 'Comment',
                initialValue: 'hello',
                placeholder: 'Add a comment',
                multiline: true,
                maxLength: 20,
                subtype: 'text',
                optional: true,
                helpText: 'Be nice',
            });
        });

        it('should open the text input screen with the multiline defaults', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {type: 'text_input', name: 'comment', label: 'Comment', multiline: true},
            }, 'post');

            fireEvent.press(getByTestId('mm_blocks.text_input.comment.edit.button'));

            expect(navigateToScreen).toHaveBeenCalledWith(Screens.MM_BLOCKS_TEXT_INPUT, expect.objectContaining({
                multiline: true,
                maxLength: 3000,
                optional: false,
            }));
        });

        it('should update the displayed value when the screen saves', () => {
            const {getByTestId, getByText} = renderInput(getBaseProps(), 'post');

            fireEvent.press(getByTestId('mm_blocks.text_input.comment.edit.button'));
            saveFromScreen('updated');

            expect(getByText('updated')).toBeVisible();
        });

        it('should trigger onAction with form values when onChange is set', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {
                    type: 'text_input',
                    name: 'comment',
                    label: 'Comment',
                    initial_value: 'hello',
                    onChange: 'refresh_action',
                },
            }, 'post');

            fireEvent.press(getByTestId('mm_blocks.text_input.comment.edit.button'));
            saveFromScreen('updated');

            expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {comment: 'updated'}});
        });

        it('should not open the text input screen when disabled', () => {
            const {getByTestId} = renderInput({
                ...getBaseProps(),
                element: {type: 'text_input', name: 'comment', label: 'Comment', initial_value: 'hello', disabled: true},
            }, 'post');

            fireEvent.press(getByTestId('mm_blocks.text_input.comment.edit.button'));

            expect(navigateToScreen).not.toHaveBeenCalled();
            expect(getByTestId('mm_blocks.text_input.comment.edit.button')).toBeVisible();
        });
    });
});
