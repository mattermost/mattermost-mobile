// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';
import {StyleSheet, Text} from 'react-native';

import Preferences from '@constants/preferences';
import {ThemeContext} from '@context/theme';
import {renderWithIntl, renderWithIntlAndTheme} from '@test/intl-test-helper';

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

// The five core themes the PR checklist requires us to verify against.
const CORE_THEME_KEYS = Object.keys(Preferences.THEMES) as Array<keyof typeof Preferences.THEMES>;

// renderWithIntlAndTheme is pinned to the default theme, so drive the theme
// explicitly through the context to exercise each core theme in turn.
function renderInTheme(theme: Theme, props: React.ComponentProps<typeof CollapsibleSection>) {
    return renderWithIntl(
        <ThemeContext.Provider value={theme}>
            <CollapsibleSection {...props}/>
        </ThemeContext.Provider>,
    );
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

    it('mounts expanded when a forceExpandVersion is already present at mount', () => {
        // A nested section under a collapsed ancestor only mounts once the ancestor
        // expands, by which point its force-expand version is already set. useDidUpdate
        // skips the mount, so the initial state must seed from the version to reveal
        // the invalid field that triggered the expand.
        const {queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: false, forceExpandVersion: 1})}/>,
        );

        expect(queryByText(CHILD)).toBeTruthy();
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

        // Seeded from the mount-time version, then a further increment keeps it open.
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

describe('CollapsibleSection accessibility hint', () => {
    beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
    });

    it('advertises the collapse action while expanded and the expand action while collapsed', () => {
        // The hint tells assistive tech what activating the header will do; it must
        // track the current state, not stay fixed to the initial one.
        const {getByLabelText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true})}/>,
        );

        const header = getByLabelText('Section');
        expect(header.props.accessibilityHint).toBe('Activates to collapse');

        fireEvent.press(header);

        expect(header.props.accessibilityHint).toBe('Activates to expand');
    });
});

describe('CollapsibleSection layout', () => {
    beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
    });

    // Pressable resolves its style-callback to a concrete style array on the host
    // node, but fall back to invoking the callback in case that changes.
    const flattenHeader = (node: any) => {
        const style = node.props.style;
        return StyleSheet.flatten(typeof style === 'function' ? style({pressed: false}) : style);
    };

    it('indents the header further for a more deeply nested section', () => {
        // Depth is the only visible cue that one section sits inside another, so a
        // deeper section must carry more left inset than a shallower one.
        const shallow = renderWithIntlAndTheme(<CollapsibleSection {...getProps({depth: 0})}/>);
        const deep = renderWithIntlAndTheme(<CollapsibleSection {...getProps({depth: 2})}/>);

        const shallowInset = flattenHeader(shallow.getByLabelText('Section')).paddingLeft ?? 0;
        const deepInset = flattenHeader(deep.getByLabelText('Section')).paddingLeft ?? 0;

        expect(deepInset).toBeGreaterThan(shallowInset);
    });

    it('applies the bordered chrome only when bordered is true', () => {
        // bordered drives the section's card treatment (tinted header background); an
        // unbordered section must render flat so nested sections don't stack borders.
        const bordered = renderWithIntlAndTheme(<CollapsibleSection {...getProps({bordered: true})}/>);
        expect(flattenHeader(bordered.getByLabelText('Section')).backgroundColor).toBeDefined();

        const flat = renderWithIntlAndTheme(<CollapsibleSection {...getProps({bordered: false})}/>);
        expect(flattenHeader(flat.getByLabelText('Section')).backgroundColor).toBeUndefined();
    });

    it('unmounts cleanly while expanded without throwing', () => {
        const {unmount, queryByText} = renderWithIntlAndTheme(
            <CollapsibleSection {...getProps({initiallyExpanded: true})}/>,
        );
        expect(queryByText(CHILD)).toBeTruthy();

        expect(() => unmount()).not.toThrow();
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

describe('CollapsibleSection theme consistency', () => {
    beforeEach(() => {
        mockUseReducedMotion.mockReturnValue(false);
    });

    // Fails loudly if the shipped set of core themes changes, so this suite can't
    // silently stop covering all five.
    it('exercises the five core themes', () => {
        expect(CORE_THEME_KEYS).toEqual(['denim', 'sapphire', 'quartz', 'indigo', 'onyx']);
    });

    it.each(CORE_THEME_KEYS)('renders with theme-derived colors in the %s theme', (key) => {
        const theme = Preferences.THEMES[key];
        const {getByText} = renderInTheme(theme, getProps({initiallyExpanded: true}));

        // Renders without crashing under this theme...
        expect(getByText(CHILD)).toBeTruthy();

        // ...and the header label pulls its color from the theme token rather than a
        // hardcoded value, so it stays legible across the light themes and dark (onyx).
        const labelColor = StyleSheet.flatten(getByText('Section').props.style).color;
        expect(labelColor).toBe(theme.centerChannelColor);
    });

    it.each(CORE_THEME_KEYS)('keeps the collapsed error affordance available in the %s theme', (key) => {
        const theme = Preferences.THEMES[key];
        const {getByLabelText} = renderInTheme(theme, getProps({initiallyExpanded: false, hasError: true}));

        // The error state renders and stays screen-reader friendly in every theme.
        expect(getByLabelText('Section, contains an error')).toBeTruthy();
    });
});
