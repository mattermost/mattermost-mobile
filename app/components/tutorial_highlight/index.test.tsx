// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';
import {View} from 'react-native';

import TutorialHighlight from './index';

// The overlay only renders its children once itemBounds is measured, which comes from
// itemRef.measure(). Supply a ref whose measure() reports a real frame.
const itemRef = {
    current: {
        measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => cb(20, 100, 300, 44),
        measure: (cb: (x: number, y: number, w: number, h: number, px: number, py: number) => void) => cb(0, 0, 300, 44, 20, 100),
    },
} as unknown as React.RefObject<View>;

const renderOverlay = (onDismiss: () => void) => {
    const result = render(
        <TutorialHighlight
            itemRef={itemRef}
            onDismiss={onDismiss}
            onShow={jest.fn()}
        />,
    );

    // The overlay's children only mount once onRootLayout has measured itemRef. The root
    // View carries no testID, so reach it by type.
    // eslint-disable-next-line new-cap -- UNSAFE_getByType is the RNTL API name
    const root = screen.UNSAFE_getByType(View);
    act(() => {
        fireEvent(root, 'layout', {
            nativeEvent: {layout: {x: 0, y: 0, width: 400, height: 800}},
        });
    });

    return result;
};

describe('TutorialHighlight', () => {
    it('should expose a pressable backdrop that dismisses the overlay', () => {
        // HighlightItem's only press handler is onPress on the react-native-svg root, which
        // routes through RNSVG's own responder and does not fire for a synthetic tap. The
        // Pressable is the real touch target, so assert it exists and dismisses.
        const onDismiss = jest.fn();
        renderOverlay(onDismiss);

        fireEvent.press(screen.getByTestId('tutorial_highlight.backdrop'));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should render the dimming scrim inside the pressable backdrop', () => {
        // An empty transparent Pressable is a real touch target for a finger but owns no
        // pixels, and hittability is derived from a pixel comparison. The backdrop has to own
        // the scrim rather than sit over it, so pin that the Svg is inside the Pressable.
        renderOverlay(jest.fn());

        const backdrop = screen.getByTestId('tutorial_highlight.backdrop');

        expect(backdrop.findByType('RNSVGSvgView' as never)).toBeTruthy();
    });
});
