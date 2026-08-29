// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, render, screen} from '@testing-library/react-native';
import React from 'react';
import {View} from 'react-native';

import TutorialHighlight from './index';

// The overlay renders its children only once itemBounds is measured from itemRef.measure(),
// so the ref has to report a real frame.
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

    // Children mount only after onRootLayout; the root View has no testID, so reach it by type.
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
        // HighlightItem's onPress goes through RNSVG's own responder and does not fire for a
        // synthetic tap, so the Pressable is the real touch target.
        const onDismiss = jest.fn();
        renderOverlay(onDismiss);

        fireEvent.press(screen.getByTestId('tutorial_highlight.backdrop'));

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should render the dimming scrim inside the pressable backdrop', () => {
        // Hittability is derived from pixels, so the backdrop must own the scrim rather than
        // sit over it.
        renderOverlay(jest.fn());

        const backdrop = screen.getByTestId('tutorial_highlight.backdrop');

        expect(backdrop.findByType('RNSVGSvgView' as never)).toBeTruthy();
    });
});
