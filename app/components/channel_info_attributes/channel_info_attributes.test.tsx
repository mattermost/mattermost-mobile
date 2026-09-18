// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ChannelInfoAttributes from './channel_info_attributes';

import type {ResolvedChannelAttribute} from '@utils/channel_attributes';

const resolved = (overrides: Partial<ResolvedChannelAttribute> = {}): ResolvedChannelAttribute => ({
    field: {id: 'fieldid00000000000000000a', name: 'sensitivity', type: 'select', attrs: {}} as ResolvedChannelAttribute['field'],
    displayValue: '',
    ...overrides,
});

// The "Not set" row is the only thing telling an administrator a required attribute is
// incomplete, and an unset optional one is omitted entirely — so the two look identical from
// the outside unless the empty-value branch is exercised directly.
describe('ChannelInfoAttributes', () => {
    it('should render the not-set row for an attribute with no value', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <ChannelInfoAttributes attributes={[resolved()]}/>,
        );

        expect(getByTestId('channel_info.attributes.sensitivity.not_set')).toBeTruthy();
    });

    it('should render a chip instead of the not-set row once a value is set', () => {
        const {getByTestId, queryByTestId} = renderWithIntlAndTheme(
            <ChannelInfoAttributes attributes={[resolved({displayValue: 'HIGH'})]}/>,
        );

        expect(getByTestId('channel_info.attributes.sensitivity.chip')).toBeTruthy();
        expect(queryByTestId('channel_info.attributes.sensitivity.not_set')).toBeNull();
    });

    it('should render nothing when there are no attributes', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <ChannelInfoAttributes attributes={[]}/>,
        );

        expect(queryByTestId('channel_info.attributes')).toBeNull();
    });
});
