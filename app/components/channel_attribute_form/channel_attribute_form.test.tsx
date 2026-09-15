// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ComponentProps, type ReactElement} from 'react';

import {General} from '@constants';
import {bottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelAttributeForm, {type ChannelAttributeFormValues} from './channel_attribute_form';

import type ChannelAttributeEditor from '@components/channel_attribute_editor';
import type {ChannelAttributeField} from '@utils/channel_attributes';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
    dismissBottomSheet: jest.fn().mockResolvedValue(undefined),
}));

const mockedBottomSheet = jest.mocked(bottomSheet);

const OPTIONS = [
    {id: 'opt-low', name: 'LOW', color: '#00FF00', rank: 1},
    {id: 'opt-high', name: 'HIGH', color: '#FF0000', rank: 2},
];

const field = (overrides: Partial<ChannelAttributeField> = {}): ChannelAttributeField => ({
    id: 'field-1',
    name: 'sensitivity',
    type: 'select',
    attrs: {required: true, options: OPTIONS},
    permissionValues: 'member',
    ...overrides,
} as ChannelAttributeField);

const render = (
    fields: ChannelAttributeField[],
    values: ChannelAttributeFormValues = {},
    onChange: ComponentProps<typeof ChannelAttributeForm>['onChange'] = jest.fn(),
    type: string = General.OPEN_CHANNEL,
) => renderWithIntlAndTheme(
    <ChannelAttributeForm
        type={type}
        fields={fields}
        values={values}
        onChange={onChange}
    />,
);

// The sheet renders in its own route, so what it was handed is inspected here,
// mirroring the pattern in channel_info_attributes.test.tsx.
const sheetProps = () => (mockedBottomSheet.mock.calls[mockedBottomSheet.mock.calls.length - 1][0]() as ReactElement<ComponentProps<typeof ChannelAttributeEditor>>).props;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ChannelAttributeForm', () => {
    it('should render nothing when there are no creatable fields', () => {
        const {queryByTestId} = render([]);

        expect(queryByTestId('channel_attribute_form')).toBeNull();
    });

    it('should render nothing for a DM or GM: mobile offers no attributes there', () => {
        const {queryByTestId} = render([field()], {}, jest.fn(), General.DM_CHANNEL);

        expect(queryByTestId('channel_attribute_form')).toBeNull();
    });

    it('should render a row per field, Not set until a value is chosen', () => {
        const {getByTestId} = render([field()]);

        expect(getByTestId('channel_attribute_form')).toBeTruthy();
        expect(getByTestId('channel_attribute_form.sensitivity.not_set')).toBeTruthy();
    });

    it('should show the chosen value as a chip', () => {
        const {getByTestId} = render([field()], {'field-1': 'opt-high'});

        const chip = getByTestId('channel_attribute_form.sensitivity.chip');
        expect(chip).toBeTruthy();
    });

    it('should open the sheet with every option reachable and the current draft pre-selected', () => {
        const {getByTestId} = render([field()], {'field-1': 'opt-high'});

        fireEvent.press(getByTestId('channel_attribute_form.sensitivity.edit'));

        expect(mockedBottomSheet).toHaveBeenCalled();
        const props = sheetProps();
        expect(props.clearable).toBe(true);
        expect(props.unlockOptions).toBe(true);
        expect(props.attribute.rawValue).toBe('opt-high');
    });

    it('should call onChange with the field id and the picked value on submit', async () => {
        const onChange = jest.fn();
        const {getByTestId} = render([field()], {}, onChange);

        fireEvent.press(getByTestId('channel_attribute_form.sensitivity.edit'));
        await sheetProps().onSubmit('field-1', 'opt-high');

        expect(onChange).toHaveBeenCalledWith('field-1', 'opt-high');
    });
});
