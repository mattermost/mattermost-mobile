// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render, waitFor, screen} from '@testing-library/react-native';
import React from 'react';
import {Animated} from 'react-native';

import AnimatedNumber from '.';

const NUMBER_HEIGHT = 10;

describe('AnimatedNumber', () => {
    // running on jest, since Animated is a native module, Animated.timing.start needs to be mocked in order to update to the final Animated.Value.
    // Ex: 1 => 2, the Animated.Value should be -20 (from -10) after the animation is done
    jest.spyOn(Animated, 'timing').mockImplementation((a, b) => ({

        // @ts-expect-error mock implementation for testing
        start: jest.fn().mockImplementation(() => a.setValue(b.toValue)),
    }) as unknown as Animated.CompositeAnimation);

    it('should render the non-animated number', () => {
        render(<AnimatedNumber animateToNumber={123}/>);

        const text = screen.getByTestId('no-animation-number');
        expect(text.children).toContainEqual('123');
    });

    it('should removed the non-animation number after getting the correct height', () => {
        render(<AnimatedNumber animateToNumber={123}/>);

        const text = screen.getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        const removedText = screen.queryByTestId('no-animation-number');

        expect(removedText).toBeNull();
    });

    it('should switch to the animated number view', async () => {
        render(<AnimatedNumber animateToNumber={123}/>);

        const text = screen.getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        const animatedView = screen.getByTestId('animation-number-main');
        expect(animatedView).toBeTruthy();
    });

    describe.each([1, 23, 579, -123, 6789, 23456])('should show the correct number of animated views based on the digits', (animateToNumber: number) => {
        const numberOfDigits = animateToNumber.toString().length;
        it(`should display ${numberOfDigits} view(s) for ${animateToNumber}`, async () => {
            render(<AnimatedNumber animateToNumber={animateToNumber}/>);

            const text = screen.getByTestId('no-animation-number');

            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

            await waitFor(() => {
                const animatedView = screen.getByTestId('animation-number-main');
                expect(animatedView.children).toHaveLength(numberOfDigits);
            });
        });
    });

    describe.each([123, 9982, 12345, 901876, -157])('should show the correct number', (animateToNumber: number) => {
        const absAnimatedNumberString = String(Math.abs(animateToNumber));
        const numberOfDigits = absAnimatedNumberString.length;
        it(`should display the number ${animateToNumber}`, async () => {
            render(<AnimatedNumber animateToNumber={animateToNumber}/>);

            const text = screen.getByTestId('no-animation-number');

            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

            const checkEachDigit = absAnimatedNumberString.split('').map(async (number, index) => {
                const useIndex = numberOfDigits - 1 - index;

                // every digit will have a row of 10 numbers, so the translateY should be the height of the number * the number * -1 (since the animation is going up)
                const transformedView = screen.getByTestId(`animated-number-view-${useIndex}`);
                const {translateY} = transformedView.props.style.transform[0];

                expect(Math.abs(translateY / NUMBER_HEIGHT)).toEqual(Number(number));
            });

            await Promise.all(checkEachDigit);
        });
    });

    describe.each([146, 144, 1, 1000000, -145])('should rerender the correct number that it animates to', (animateToNumber: number) => {
        it(`should display the number ${animateToNumber}`, async () => {
            const startingNumber = 145;
            render(<AnimatedNumber animateToNumber={startingNumber}/>);

            const text = screen.getByTestId('no-animation-number');

            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

            screen.rerender(<AnimatedNumber animateToNumber={animateToNumber}/>);

            const animateToNumberString = String(Math.abs(animateToNumber));
            const checkEachDigit = animateToNumberString.split('').map(async (number, index) => {
                const useIndex = animateToNumberString.length - 1 - index;

                const transformedView = screen.getByTestId(`animated-number-view-${useIndex}`);
                const {translateY} = transformedView.props.style.transform[0];

                expect(Math.abs((translateY) / NUMBER_HEIGHT)).toEqual(Number(number));
            });

            await Promise.all(checkEachDigit);
        });
    });

    it('KNOWN UI BUG: should show that there will be an issue if the text height changes, due to the non-animated number view has been removed', async () => {
        // the number text will get cut-off if the user changes the text size on their mobile devices
        render(<AnimatedNumber animateToNumber={123}/>);

        const text = screen.getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        try {
            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT + NUMBER_HEIGHT}}});
        } catch (e) {
            expect(e).toEqual(new Error('Unable to find node on an unmounted component.'));
        }

        const animatedView = screen.getByTestId('animation-number-main');
        expect(animatedView).toBeTruthy();
    });
});
