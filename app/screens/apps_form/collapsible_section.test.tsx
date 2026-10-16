// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CollapsibleSection from './collapsible_section';

const child = (
    <Text testID='child'>{'Cargo weight'}</Text>
);

describe('CollapsibleSection', () => {
    it('renders the label and shows children when expanded', () => {
        const {getByText, getByTestId} = renderWithIntlAndTheme(
            <CollapsibleSection
                label='Row 1'
                expanded={true}
                testID='section'
            >
                {child}
            </CollapsibleSection>,
        );

        expect(getByText('Row 1')).toBeTruthy();
        expect(getByTestId('child')).toBeTruthy();
    });

    it('keeps children unmounted until the header is pressed', () => {
        const {queryByTestId, getByTestId} = renderWithIntlAndTheme(
            <CollapsibleSection
                label='Row 1'
                expanded={false}
                testID='section'
            >
                {child}
            </CollapsibleSection>,
        );

        expect(queryByTestId('child')).toBeNull();

        fireEvent.press(getByTestId('section.toggle'));

        expect(getByTestId('child')).toBeTruthy();
    });

    it('collapses again on a second press', () => {
        const {queryByTestId, getByTestId} = renderWithIntlAndTheme(
            <CollapsibleSection
                label='Row 1'
                expanded={true}
                testID='section'
            >
                {child}
            </CollapsibleSection>,
        );

        fireEvent.press(getByTestId('section.toggle'));

        expect(queryByTestId('child')).toBeNull();
    });

    it('re-syncs when a refreshed form changes the expanded prop', () => {
        const {queryByTestId, rerender} = renderWithIntlAndTheme(
            <CollapsibleSection
                label='Row 1'
                expanded={false}
                testID='section'
            >
                {child}
            </CollapsibleSection>,
        );

        expect(queryByTestId('child')).toBeNull();

        rerender(
            <CollapsibleSection
                label='Row 1'
                expanded={true}
                testID='section'
            >
                {child}
            </CollapsibleSection>,
        );

        expect(queryByTestId('child')).toBeTruthy();
    });
});
