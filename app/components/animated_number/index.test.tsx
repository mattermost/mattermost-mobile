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

describe.skip('AnimatedNumber', () => {
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

const NUMBER_HEIGHT = 15;

describe('AnimatedNumber', () => {
    jest.spyOn(Animated, 'timing').mockImplementation((a, b) => ({
        start: jest.fn().mockImplementation(() => a.setValue(b.toValue as number & {x: number; y: number})),
    }) as unknown as Animated.CompositeAnimation);

    it('should render the number', () => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');
        expect(text.children).toContain('123');
    });

    it('should removed the non-animation number', async () => {
        const {getByTestId, queryByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        await waitFor(() => {
            const removedText = queryByTestId('no-animation-number');

            expect(removedText).toBeNull();
        });
    });

    it('should switch to the animated number view', async () => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        await waitFor(() => {
            const animatedView = getByTestId('animation-number-main');
            expect(animatedView).toBeTruthy();
        });
    });

    it.each([123, 9982, 328])('should show the correct number', async (animateToNumber: number) => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={animateToNumber}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: NUMBER_HEIGHT}}});

        const animateToNumberString = Math.abs(animateToNumber).toString();
        const checkEachDigit = animateToNumberString.split('').map(async (number, index) => {
            const useIndex = animateToNumberString.length - 1 - index;

            const transformedView = getByTestId(`animated-number-view-${useIndex}`);
            const translateY = transformedView.props.style.transform[0].translateY;

            expect(Math.abs(translateY / NUMBER_HEIGHT)).toEqual(Number(number));
        });

        await Promise.all(checkEachDigit);
    });

    it.each([146, 144, 1, 1000000, -111])('should show the correct number that it moved to', async (animateToNumber: number) => {
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

            expect(Math.abs(translateY / NUMBER_HEIGHT)).toEqual(Number(number));
        });

        await Promise.all(checkEachDigit);
    });
});
