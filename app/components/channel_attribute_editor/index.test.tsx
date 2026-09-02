// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {dismissBottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelAttributeEditor from './index';

import type {ChannelAttributeField, ResolvedChannelAttribute} from '@utils/channel_attributes';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn().mockResolvedValue(undefined),
}));

const OPTIONS = [
    {id: 'level-public', name: 'Public', color: '#00FF00', rank: 1},
    {id: 'level-secret', name: 'Secret', color: '#FF0000', rank: 2},
    {id: 'level-top-secret', name: 'Top Secret', color: '#FCE83A', rank: 3},
];

const field = (overrides: Partial<ChannelAttributeField> = {}): ChannelAttributeField => ({
    id: 'cf-1',
    name: 'classification',
    type: 'rank',
    attrs: {options: OPTIONS},
    permissionValues: 'member',
    ...overrides,
} as ChannelAttributeField);

const attribute = (overrides: Partial<ResolvedChannelAttribute> = {}): ResolvedChannelAttribute => ({
    field: field(),
    rawValue: undefined,
    displayValue: '',
    ...overrides,
});

describe('ChannelAttributeEditor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should title the sheet with the attribute name', () => {
        const {getByText} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute()}
                clearable={false}
                onSubmit={jest.fn()}
            />,
        );

        expect(getByText('Set classification')).toBeTruthy();
    });

    it('should list every option when nothing is set', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute()}
                clearable={false}
                onSubmit={jest.fn()}
            />,
        );

        for (const option of OPTIONS) {
            expect(getByTestId(`channel_attribute_editor.classification.option.${option.id}`)).toBeTruthy();
        }
    });

    it('should narrow the list to the options a raise_only policy permits', () => {
        const raiseOnly = field({attrs: {options: OPTIONS, change_policy: 'raise_only'}});
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute({field: raiseOnly, rawValue: 'level-secret', displayValue: 'Secret'})}
                clearable={false}
                onSubmit={jest.fn()}
            />,
        );

        expect(getByTestId('channel_attribute_editor.classification.option.level-top-secret')).toBeTruthy();
        expect(queryByTestId('channel_attribute_editor.classification.option.level-public')).toBeNull();
        expect(queryByTestId('channel_attribute_editor.classification.option.level-secret')).toBeNull();
    });

    it('should narrow the list to the options a lower_only policy permits', () => {
        const lowerOnly = field({attrs: {options: OPTIONS, change_policy: 'lower_only'}});
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute({field: lowerOnly, rawValue: 'level-secret', displayValue: 'Secret'})}
                clearable={false}
                onSubmit={jest.fn()}
            />,
        );

        expect(getByTestId('channel_attribute_editor.classification.option.level-public')).toBeTruthy();
        expect(queryByTestId('channel_attribute_editor.classification.option.level-top-secret')).toBeNull();
    });

    it('should mark the current value as selected', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute({rawValue: 'level-secret', displayValue: 'Secret'})}
                clearable={true}
                onSubmit={jest.fn()}
            />,
        );

        expect(getByTestId('channel_attribute_editor.classification.option.level-secret').props.accessibilityState).toEqual({selected: true});
        expect(getByTestId('channel_attribute_editor.classification.option.level-public').props.accessibilityState).toEqual({selected: false});
    });

    it('should commit a single-select choice immediately, dismissing the sheet first', async () => {
        const onSubmit = jest.fn();
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute()}
                clearable={false}
                onSubmit={onSubmit}
            />,
        );

        fireEvent.press(getByTestId('channel_attribute_editor.classification.option.level-secret'));

        // The sheet is dismissed before the write is handed to the parent, so the
        // parent's error surface is on screen rather than behind the sheet.
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('cf-1', 'level-secret'));
        expect(dismissBottomSheet).toHaveBeenCalled();
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('should write once when an option is double-tapped', async () => {
        const onSubmit = jest.fn();
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute()}
                clearable={false}
                onSubmit={onSubmit}
            />,
        );

        const option = getByTestId('channel_attribute_editor.classification.option.level-secret');
        fireEvent.press(option);
        fireEvent.press(option);

        await waitFor(() => expect(onSubmit).toHaveBeenCalled());
        expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('should let a multiselect be toggled repeatedly, which the double-tap guard must not swallow', () => {
        const multiField = field({type: 'multiselect', attrs: {options: OPTIONS}});
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute({field: multiField, rawValue: [], displayValue: ''})}
                clearable={false}
                onSubmit={jest.fn()}
            />,
        );

        fireEvent.press(getByTestId('channel_attribute_editor.classification.option.level-public'));
        fireEvent.press(getByTestId('channel_attribute_editor.classification.option.level-secret'));

        expect(getByTestId('channel_attribute_editor.classification.option.level-public').props.accessibilityState).toEqual({selected: true});
        expect(getByTestId('channel_attribute_editor.classification.option.level-secret').props.accessibilityState).toEqual({selected: true});
    });

    it('should offer no clear affordance when clearing is not allowed', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute({rawValue: 'level-secret', displayValue: 'Secret'})}
                clearable={false}
                onSubmit={jest.fn()}
            />,
        );

        expect(queryByTestId('channel_attribute_editor.classification.clear')).toBeNull();
    });

    it('should submit null when the value is cleared', async () => {
        const onSubmit = jest.fn();
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeEditor
                attribute={attribute({rawValue: 'level-secret', displayValue: 'Secret'})}
                clearable={true}
                onSubmit={onSubmit}
            />,
        );

        fireEvent.press(getByTestId('channel_attribute_editor.classification.clear'));

        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('cf-1', null));
    });

    describe('multiselect', () => {
        const multiField = field({type: 'multiselect', attrs: {options: OPTIONS}});

        it('should toggle selections and submit the whole list on save, rather than on each tap', async () => {
            const onSubmit = jest.fn();
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <ChannelAttributeEditor
                    attribute={attribute({field: multiField, rawValue: ['level-public'], displayValue: 'Public'})}
                    clearable={true}
                    onSubmit={onSubmit}
                />,
            );

            fireEvent.press(getByTestId('channel_attribute_editor.classification.option.level-secret'));
            expect(onSubmit).not.toHaveBeenCalled();

            fireEvent.press(getByText('Save'));

            await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('cf-1', ['level-public', 'level-secret']));
        });

        it('should remove an already selected option when it is tapped again', async () => {
            const onSubmit = jest.fn();
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <ChannelAttributeEditor
                    attribute={attribute({field: multiField, rawValue: ['level-public', 'level-secret'], displayValue: 'Public, Secret'})}
                    clearable={true}
                    onSubmit={onSubmit}
                />,
            );

            fireEvent.press(getByTestId('channel_attribute_editor.classification.option.level-secret'));
            fireEvent.press(getByText('Save'));

            await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('cf-1', ['level-public']));
        });
    });

    describe('text', () => {
        const textField = field({type: 'text', name: 'program', attrs: {}});

        it('should render an input seeded with the current value', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <ChannelAttributeEditor
                    attribute={attribute({field: textField, rawValue: 'Aurora', displayValue: 'Aurora'})}
                    clearable={true}
                    onSubmit={jest.fn()}
                />,
            );

            expect(getByTestId('channel_attribute_editor.program.input').props.value).toBe('Aurora');
        });

        it('should submit the trimmed text on save', async () => {
            const onSubmit = jest.fn();
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <ChannelAttributeEditor
                    attribute={attribute({field: textField, rawValue: 'Aurora', displayValue: 'Aurora'})}
                    clearable={true}
                    onSubmit={onSubmit}
                />,
            );

            fireEvent.changeText(getByTestId('channel_attribute_editor.program.input'), '  Orion  ');
            fireEvent.press(getByText('Save'));

            await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('cf-1', 'Orion'));
        });

        it('should not submit an unchanged edit, so abandoning it does not clear the value', () => {
            const onSubmit = jest.fn();
            const {getByTestId, getByText} = renderWithIntlAndTheme(
                <ChannelAttributeEditor
                    attribute={attribute({field: textField, rawValue: 'Aurora', displayValue: 'Aurora'})}
                    clearable={true}
                    onSubmit={onSubmit}
                />,
            );

            fireEvent.changeText(getByTestId('channel_attribute_editor.program.input'), 'Aurora ');
            fireEvent.press(getByText('Save'));

            expect(onSubmit).not.toHaveBeenCalled();
        });
    });
});
