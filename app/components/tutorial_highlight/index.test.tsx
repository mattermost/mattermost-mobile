// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';
import {View} from 'react-native';
import Svg from 'react-native-svg';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import TutorialHighlight from './index';

// The overlay only renders its children once itemBounds is measured, which comes from
// itemRef.measure(). Supply a ref whose measure() reports a real frame.
const measuredRef = {
    current: {
        measure: (cb: (x: number, y: number, w: number, h: number, px: number, py: number) => void) => {
            cb(0, 0, 100, 50, 10, 20);
        },
    },
} as unknown as React.RefObject<View>;

const renderOverlay = (onDismiss: jest.Mock) => renderWithIntlAndTheme(
    <TutorialHighlight
        itemRef={measuredRef}
        onDismiss={onDismiss}
    />,
);

describe('TutorialHighlight', () => {
    // HighlightItem's only press handler is onPress on the react-native-svg root, which
    // routes through RNSVG's own responder and does not fire for a synthetic tap. The
    // Pressable is the real touch target, so assert it exists and dismisses.
    it('should expose a pressable backdrop that dismisses the overlay', () => {
        const onDismiss = jest.fn();
        const {getByTestId} = renderOverlay(onDismiss);

        // The overlay's children only mount once onRootLayout has measured itemRef.
        act(() => {
            fireEvent(getByTestId('tutorial_highlight.overlay'), 'layout');
        });

        fireEvent.press(getByTestId('tutorial_highlight.backdrop'));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    // An empty transparent Pressable is a real touch target for a finger but owns no pixels,
    // and hittability is derived from a pixel comparison. The backdrop has to own the scrim
    // rather than sit over it, so pin that the dimming Svg is inside the Pressable.
    it('should render the dimming scrim inside the pressable backdrop', () => {
        const {getByTestId} = renderOverlay(jest.fn());

        act(() => {
            fireEvent(getByTestId('tutorial_highlight.overlay'), 'layout');
        });

        const backdrop = getByTestId('tutorial_highlight.backdrop');

        expect(backdrop.findAllByType(Svg)).toHaveLength(1);
    });
});
