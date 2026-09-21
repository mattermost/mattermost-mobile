// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import CollapsibleSection from './collapsible_section';

// Controllable reduced-motion so the animation-preference branch can be exercised.
// Default to false (animations on) for the majority of tests.
const mockUseReducedMotion = jest.fn(() => false);
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    return {
        ...Reanimated,
        useReducedMotion: () => mockUseReducedMotion(),
    };
});

const CHILD = 'child-content';

function getProps(overrides: Partial<React.ComponentProps<typeof CollapsibleSection>> = {}) {
    return {
        label: 'Section',
        initiallyExpanded: true,
        bordered: true,
        depth: 0,
        children: <Text>{CHILD}</Text>,
        ...overrides,
    };
}

describe('CollapsibleSection expand/collapse', () => {
    beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
    });

    it('mounts children when initiallyExpanded is true', () => {
        const {queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true})}/>,
        );

        expect(queryByText(CHILD)).toBeTruthy();
    });

    it('does not mount children when initiallyExpanded is false', () => {
        // Children mount only when expanded, so a collapsed section must not render
        // its content at all (not merely hide it) — this is what keeps hidden fields
        // out of the layout while their values still submit.
        const {queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false})}/>,
        );

        expect(queryByText(CHILD)).toBeNull();
    });

    it('reveals children when a collapsed header is pressed', () => {
        const {getByLabelText, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false})}/>,
        );

        expect(queryByText(CHILD)).toBeNull();

        fireEvent.press(getByLabelText('Section'));

        expect(queryByText(CHILD)).toBeTruthy();
    });

    it('hides children when an expanded header is pressed', () => {
        const {getByLabelText, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true})}/>,
        );

        fireEvent.press(getByLabelText('Section'));

        expect(queryByText(CHILD)).toBeNull();
    });

    it('exposes the expanded state to assistive tech via accessibilityState', () => {
        const {getByLabelText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false})}/>,
        );

        const header = getByLabelText('Section');
        expect(header.props.accessibilityState).toMatchObject({expanded: false});

        fireEvent.press(header);

        expect(header.props.accessibilityState).toMatchObject({expanded: true});
    });

    it('ignores a rapid second tap (double-tap protection)', () => {
        // Start expanded and press twice within the debounce window. Two effective
        // toggles would return to expanded; a single effective toggle leaves it
        // collapsed — so a hidden child proves the second press was swallowed.
        const {getByLabelText, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true})}/>,
        );

        const header = getByLabelText('Section');
        fireEvent.press(header);
        fireEvent.press(header);

        expect(queryByText(CHILD)).toBeNull();
    });
});

describe('CollapsibleSection prop-driven expansion', () => {
    beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
    });

    it('re-syncs expansion when initiallyExpanded changes (e.g. multistep refresh)', () => {
        const {rerender, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false})}/>,
        );

        expect(queryByText(CHILD)).toBeNull();

        rerender(<CollapsibleSection {...getProps({initiallyExpanded: true})}/>);

        expect(queryByText(CHILD)).toBeTruthy();
    });

    it('does not force-expand from a forceExpandVersion present only at mount', () => {
        // Version reacts to *increments*, not to an initial value — a section that
        // mounts collapsed with a version already set must stay collapsed.
        const {queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false, forceExpandVersion: 1})}/>,
        );

        expect(queryByText(CHILD)).toBeNull();
    });

    it('force-expands a user-collapsed section when forceExpandVersion increments', () => {
        const {rerender, getByLabelText, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true, forceExpandVersion: 0})}/>,
        );

        // User collapses it.
        fireEvent.press(getByLabelText('Section'));
        expect(queryByText(CHILD)).toBeNull();

        // Parent bumps the version (e.g. a failed submit revealed an error inside).
        rerender(<CollapsibleSection {...getProps({initiallyExpanded: true, forceExpandVersion: 1})}/>);

        expect(queryByText(CHILD)).toBeTruthy();
    });

    it('re-opens again on each subsequent forceExpandVersion increment after the user re-collapses', () => {
        const {rerender, getByLabelText, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false, forceExpandVersion: 1})}/>,
        );

        // First increment opens it.
        rerender(<CollapsibleSection {...getProps({initiallyExpanded: false, forceExpandVersion: 2})}/>);
        expect(queryByText(CHILD)).toBeTruthy();

        // User collapses it once more.
        fireEvent.press(getByLabelText('Section'));
        expect(queryByText(CHILD)).toBeNull();

        // A further increment must re-open it — the effect reacts to the change, not a fixed value.
        rerender(<CollapsibleSection {...getProps({initiallyExpanded: false, forceExpandVersion: 3})}/>);
        expect(queryByText(CHILD)).toBeTruthy();
    });

    it('re-syncs to collapsed when initiallyExpanded flips to false (multistep refresh)', () => {
        const {rerender, getByLabelText, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true})}/>,
        );

        expect(queryByText(CHILD)).toBeTruthy();

        rerender(<CollapsibleSection {...getProps({initiallyExpanded: false})}/>);

        expect(queryByText(CHILD)).toBeNull();
        expect(getByLabelText('Section').props.accessibilityState).toMatchObject({expanded: false});
    });
});

describe('CollapsibleSection error affordance', () => {
    beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
    });

    it('annotates the header for screen readers when collapsed with an error', () => {
        const {getByLabelText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false, hasError: true})}/>,
        );

        // The error is surfaced in the a11y label, not only via icon color.
        expect(getByLabelText('Section, contains an error')).toBeTruthy();
    });

    it('drops the error annotation once the errored section is expanded', () => {
        // When open, the fields themselves show their errors, so the header should
        // revert to its plain label rather than double-announcing the error.
        const {getByLabelText, queryByLabelText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true, hasError: true})}/>,
        );

        expect(queryByLabelText('Section, contains an error')).toBeNull();
        expect(getByLabelText('Section')).toBeTruthy();
    });

    it('uses the plain label when there is no error', () => {
        const {getByLabelText, queryByLabelText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false, hasError: false})}/>,
        );

        expect(getByLabelText('Section')).toBeTruthy();
        expect(queryByLabelText('Section, contains an error')).toBeNull();
    });
});

describe('CollapsibleSection reduced motion', () => {
    it('still reveals children on expand when reduced motion is enabled', () => {
        mockUseReducedMotion.mockReturnValue(true);

        const {getByLabelText, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false})}/>,
        );

        expect(queryByText(CHILD)).toBeNull();

        fireEvent.press(getByLabelText('Section'));

        // The reduced-motion branch skips the enter animation but must not skip
        // mounting the content.
        expect(queryByText(CHILD)).toBeTruthy();
    });
});
