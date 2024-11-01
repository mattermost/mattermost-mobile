// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';
import {Animated} from 'react-native';

import AnimatedNumber from '.';

// jest.mock('../../../node_modules/react-native/Libraries/Text/Text', () => {
//     const Text = jest.requireActual('../../../node_modules/react-native/Libraries/Text/Text');

//     // class MockText extends React.Component {
//     //     render() {
//     //         return React.createElement('Text', this.props, this.props.children);
//     //     }
//     // }

//     const MockText = jest.fn((props) => (<Text
//         {...props}
//         onLayout={() => ({nativeEvent: {layout: {height: 10}}})}
//     />));

//     return MockText;
// });

// no longer used for testing, but left for comparison
describe.skip('AnimatedNumber, using toMatchSnapshot', () => {
    it('should render correctly', () => {
        const {toJSON} = render(<AnimatedNumber animateToNumber={123}/>);
        expect(toJSON()).toMatchSnapshot();
    });

    it('should rerender the correct number', () => {
        const {toJSON, getByTestId, rerender} = render(<AnimatedNumber animateToNumber={123}/>);

        expect(toJSON()).toMatchSnapshot();

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: 10}}});

        rerender(<AnimatedNumber animateToNumber={124}/>);

        rerender(<AnimatedNumber animateToNumber={125}/>);

        expect(toJSON()).toMatchSnapshot();
    });
});

const NUMBER_HEIGHT = 10;

describe('AnimatedNumber', () => {
    // running on jest, since Animated is a native module, Animated.timing.start needs to be mocked in order to update to the final Animated.Value.
    // Ex: 1 => 2, the Animated.Value should be -20 (from -10) after the animation is done
    jest.spyOn(Animated, 'timing').mockImplementation((a, b) => ({

        // @ts-expect-error mock implementation for testing
        start: jest.fn().mockImplementation(() => a.setValue(b.toValue)),
    }) as unknown as Animated.CompositeAnimation);

    it('should render the non-animated number', () => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');
        expect(text.children[0]).toEqual('123');
    });

    it('should removed the non-animation number after getting the correct height', () => {
        const {getByTestId, queryByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        const removedText = queryByTestId('no-animation-number');

        expect(removedText).toBeNull();
    });

    it('should switch to the animated number view', async () => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        const animatedView = getByTestId('animation-number-main');
        expect(animatedView).toBeTruthy();
    });

    describe.each([1, 23, 579, -123, 6789, 23456])('should show the correct number of animated views based on the digits', (animateToNumber: number) => {
        it(`should display ${animateToNumber.toString().length} view(s) for ${animateToNumber}`, async () => {
            const {getByTestId} = render(<AnimatedNumber animateToNumber={animateToNumber}/>);

            const text = getByTestId('no-animation-number');

            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

            await waitFor(() => {
                const animatedView = getByTestId('animation-number-main');
                expect(animatedView.children).toHaveLength(animateToNumber.toString().length);
            });
        });
    });

    describe.each([123, 9982, 328, 1111, 2222, 3333])('should show the correct number', (animateToNumber: number) => {
        it(`should display the number ${animateToNumber}`, async () => {
            const {getByTestId} = render(<AnimatedNumber animateToNumber={animateToNumber}/>);

            const text = getByTestId('no-animation-number');

            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

            const checkEachDigit = animateToNumber.toString().split('').map(async (number, index) => {
                const useIndex = animateToNumber.toString().length - 1 - index;

                let translateY = -1;

                // every digit will have a row of 10 numbers, so the translateY should be the height of the number * the number * -1 (since the animation is going up)
                await waitFor(() => {
                    const transformedView = getByTestId(`animated-number-view-${useIndex}`);

                    translateY = transformedView.props.style.transform[0].translateY;
                });

                expect(Math.abs(translateY / NUMBER_HEIGHT)).toEqual(Number(number));
            });

            await Promise.all(checkEachDigit);
        });
    });

    describe.each([146, 144, 1, 1000000, -145])('should rerender the correct number that it animates to', (animateToNumber: number) => {
        it(`should display the number ${animateToNumber}`, async () => {
            const startingNumber = 145;
            const {getByTestId, rerender} = render(<AnimatedNumber animateToNumber={startingNumber}/>);

            const text = getByTestId('no-animation-number');

            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

            rerender(<AnimatedNumber animateToNumber={animateToNumber}/>);

            const animateToNumberString = Math.abs(animateToNumber).toString();
            const checkEachDigit = animateToNumberString.split('').map(async (number, index) => {
                const useIndex = animateToNumberString.length - 1 - index;

                const transformedView = getByTestId(`animated-number-view-${useIndex}`);
                const translateY = transformedView.props.style.transform[0].translateY;

                expect(Math.abs((translateY) / NUMBER_HEIGHT)).toEqual(Number(number));
            });

            await Promise.all(checkEachDigit);
        });
    });

    it('KNOWN UI BUG: should show that there will be an issue if the text height changes, due to the non-animated number view has been removed', async () => {
        // the number text will get cut-off if the user changes the text size on their mobile devices
        const {getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        try {
            fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});
        } catch (e) {
            expect(e).toBeTruthy();
        }

        const animatedView = getByTestId('animation-number-main');
        expect(animatedView).toBeTruthy();
    });
});
