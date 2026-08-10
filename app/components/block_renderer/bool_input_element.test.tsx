// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps} from 'react';

import {Screens} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import {BoolInputElement} from './bool_input_element';
import {MmBlocksForm} from './form';
import {MmBlocksContextProvider} from './mm_blocks_context_provider';

describe('BoolInputElement', () => {
    const onAction = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    function getBaseProps(): ComponentProps<typeof BoolInputElement> {
        return {
            element: {
                type: 'bool_input',
                name: 'agree',
                label: 'I agree',
            },
            onAction,
        };
    }

    function renderInput(props: ComponentProps<typeof BoolInputElement>) {
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
                    <BoolInputElement {...props}/>
                </MmBlocksForm>
            </MmBlocksContextProvider>,
        );
    }

    it('should return null when name is missing', () => {
        const {toJSON} = renderInput({
            ...getBaseProps(),
            element: {type: 'bool_input', name: '', label: 'I agree'},
        });

        expect(toJSON()).toBeNull();
    });

    it('should return null when label is missing or blank', () => {
        const {toJSON: missingLabel} = renderInput({
            ...getBaseProps(),
            element: {type: 'bool_input', name: 'agree', label: ''},
        });
        const {toJSON: blankLabel} = renderInput({
            ...getBaseProps(),
            element: {type: 'bool_input', name: 'agree', label: '   '},
        });

        expect(missingLabel()).toBeNull();
        expect(blankLabel()).toBeNull();
    });

    it('should show a required asterisk by default', () => {
        const {getByText} = renderInput(getBaseProps());

        expect(getByText(' *')).toBeTruthy();
    });

    it('should show (optional) when the field is optional', () => {
        const {getByText, queryByText} = renderInput({
            ...getBaseProps(),
            element: {type: 'bool_input', name: 'agree', label: 'I agree', optional: true},
        });

        expect(getByText('(optional)')).toBeTruthy();
        expect(queryByText(' *')).toBeNull();
    });

    it('should default to false and toggle on change', () => {
        const {getByTestId} = renderInput(getBaseProps());

        const toggle = getByTestId('mm_blocks.bool_input.agree.toggled.false.button');
        fireEvent(toggle, 'valueChange', true);

        expect(getByTestId('mm_blocks.bool_input.agree.toggled.true.button')).toBeTruthy();
    });

    it('should trigger onAction with form values when onChange is set', () => {
        const {getByTestId} = renderInput({
            ...getBaseProps(),
            element: {
                type: 'bool_input',
                name: 'agree',
                label: 'I agree',
                onChange: 'refresh_action',
            },
        });

        fireEvent(getByTestId('mm_blocks.bool_input.agree.toggled.false.button'), 'valueChange', true);

        expect(onAction).toHaveBeenCalledWith({actionId: 'refresh_action', formValues: {agree: true}});
    });

    it('should not register an empty-string key when name is blank', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <MmBlocksContextProvider
                channelId='channel-id'
                location={Screens.CHANNEL}
                postId='post-id'
            >
                <MmBlocksForm
                    errors={{}}
                    onErrorsChange={jest.fn()}
                >
                    <BoolInputElement
                        element={{type: 'bool_input', name: '', label: 'Invalid'}}
                        onAction={onAction}
                    />
                    <BoolInputElement
                        element={{
                            type: 'bool_input',
                            name: 'agree',
                            label: 'I agree',
                            onChange: 'refresh_action',
                        }}
                        onAction={onAction}
                    />
                </MmBlocksForm>
            </MmBlocksContextProvider>,
        );

        fireEvent(getByTestId('mm_blocks.bool_input.agree.toggled.false.button'), 'valueChange', true);

        const formValues = onAction.mock.calls[0][0].formValues;
        expect(formValues).not.toHaveProperty('');
        expect(formValues).toEqual({agree: true});
    });
});
