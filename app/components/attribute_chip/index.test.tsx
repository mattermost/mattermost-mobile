// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import AttributeChip from './index';

const LONG_VALUE = 'UNCLASSIFIED//FOUO//NOFORN';

describe('AttributeChip', () => {
    it('should always render the value as text, so colour is never the only carrier of meaning', () => {
        const {getByText} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value='SECRET'
                color='#FF0000'
            />,
        );

        expect(getByText('SECRET')).toBeTruthy();
    });

    it('should announce the attribute alongside the value by default', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value='SECRET'
                testID='chip'
            />,
        );

        expect(getByTestId('chip.value').props.accessibilityLabel).toBe('classification: SECRET');
    });

    it('should announce the value alone where the label is already visible beside it', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value='SECRET'
                announceLabel={false}
                testID='chip'
            />,
        );

        expect(getByTestId('chip.value').props.accessibilityLabel).toBe('SECRET');
    });

    it('should truncate a long value in the header, where the row budget is fixed', () => {
        const {getByText} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value={LONG_VALUE}
                variant='header'
            />,
        );

        expect(getByText('UNCLASSIFIED//F…')).toBeTruthy();
    });

    it('should render a long value in full in a picker, where two markings can share a prefix', () => {
        const {getByText} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value={LONG_VALUE}
                variant='option'
            />,
        );

        expect(getByText(LONG_VALUE)).toBeTruthy();
    });

    it('should announce the untruncated value even when the text is truncated', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value={LONG_VALUE}
                variant='header'
                testID='chip'
            />,
        );

        expect(getByTestId('chip.value').props.accessibilityLabel).toBe(`classification: ${LONG_VALUE}`);
    });

    it('should fall back to the neutral treatment for a malformed colour', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value='SECRET'
                color='not-a-colour'
                testID='chip'
            />,
        );

        // The container must not take an unparseable background: an unknown
        // foreground on an unknown background is the one unreadable outcome.
        const style = getByTestId('chip').props.style.flat();
        expect(style.some((s: {backgroundColor?: string}) => s?.backgroundColor === 'not-a-colour')).toBe(false);
    });

    it('should use the option colour as the background when it is valid', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <AttributeChip
                label='classification'
                value='SECRET'
                color='#FF0000'
                testID='chip'
            />,
        );

        const style = getByTestId('chip').props.style.flat();
        expect(style.some((s: {backgroundColor?: string}) => s?.backgroundColor === '#FF0000')).toBe(true);
    });
});
