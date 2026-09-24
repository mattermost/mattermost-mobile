// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React, {type ReactElement} from 'react';

import {bottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelAttributeLabels from './index';

import type {ResolvedChannelAttribute} from '@utils/channel_attributes';

jest.mock('@screens/navigation', () => ({
    bottomSheet: jest.fn(),
}));

const resolved = (id: string, name: string, values: string[]): ResolvedChannelAttribute => ({
    field: {id, name, type: 'multiselect', attrs: {}} as ResolvedChannelAttribute['field'],
    displayValue: values.join(', '),
    displayValues: values.map((value) => ({value})),
});

describe('ChannelAttributeLabels', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should list every attribute value in the overflow sheet, not only the hidden ones', () => {
        const attributes = [
            resolved('field-1', 'classification', ['SECRET']),
            resolved('field-2', 'program', ['ROOT', 'LEVEL2', 'LEVEL 1.1']),
        ];

        const {getByTestId, getByText, queryByTestId} = renderWithIntlAndTheme(
            <ChannelAttributeLabels attributes={attributes}/>,
        );

        // * Two values inline, the other two behind +2.
        expect(getByTestId('channel_attribute_labels.chip.classification')).toBeTruthy();
        expect(getByTestId('channel_attribute_labels.chip.program.0')).toBeTruthy();
        expect(queryByTestId('channel_attribute_labels.chip.program.1')).toBeNull();
        expect(getByText('+2')).toBeTruthy();

        fireEvent.press(getByTestId('channel_attribute_labels.overflow'));
        expect(bottomSheet).toHaveBeenCalledTimes(1);

        const renderContent = jest.mocked(bottomSheet).mock.calls[0][0] as () => ReactElement;
        const sheet = renderWithIntlAndTheme(renderContent());

        // * The sheet lists both attributes with all four values, under its own testIDs.
        expect(sheet.getByTestId('channel_attribute_labels.overflow_sheet.chip.classification.value')).toHaveTextContent('SECRET');
        expect(sheet.getByTestId('channel_attribute_labels.overflow_sheet.chip.program.0.value')).toHaveTextContent('ROOT');
        expect(sheet.getByTestId('channel_attribute_labels.overflow_sheet.chip.program.1.value')).toHaveTextContent('LEVEL2');
        expect(sheet.getByTestId('channel_attribute_labels.overflow_sheet.chip.program.2.value')).toHaveTextContent('LEVEL 1.1');
        expect(sheet.queryByTestId('channel_attribute_labels.overflow_sheet.chip.program.3.value')).toBeNull();
    });
});
