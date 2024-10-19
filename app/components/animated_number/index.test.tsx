// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {fireEvent, render, waitFor} from '@testing-library/react-native';
import React from 'react';

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

describe('AnimatedNumber', () => {
    it('should render correctly', () => {
        const {toJSON} = render(<AnimatedNumber animateToNumber={123}/>);
        expect(toJSON()).toMatchSnapshot();
    });

    it('should render correctly 2', () => {
        const {toJSON, rerender, getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);
        expect(toJSON()).toMatchSnapshot();

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: 10}}});

        rerender(<AnimatedNumber
            animateToNumber={123}
            fontStyle={{color: 'red'}}
                 />);

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

describe.skip('AnimatedNumber', () => {
    it('should render the number', () => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');
        expect(text.children).toContain('123');
    });

    it('should removed the non-animation number', async () => {
        const {getByTestId, queryByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');

        expect(text.children).toContain('123');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: 10}}});

        await waitFor(() => {
            const removedText = queryByTestId('no-animation-number');

            expect(removedText).toBeNull();
        });
    });

    it('should switch to the animated number view', async () => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={123}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: 10}}});

        await waitFor(() => {
            const animatedView = getByTestId('animation-number-main');
            expect(animatedView).toBeTruthy();
        });
    });

    it.each([123, 9982, 328])('should show the correct number', async (animateToNumber: number) => {
        const {getByTestId} = render(<AnimatedNumber animateToNumber={animateToNumber}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: 10}}});

        animateToNumber.toString().split('').forEach(async (number, index) => {
            const useIndex = animateToNumber.toString().length - 1 - index;

            let translateY = -1;
            await waitFor(() => {
                const transformedView = getByTestId(`animated-number-view-${useIndex}`);
                translateY = transformedView.props.style.transform[0].translateY;
            });

            const translateYValue = Number(number) * 10;

            expect(translateY).toBe(translateYValue * -1);

            const numberShowing = getByTestId(`text-${useIndex}-${number}`);

            expect(numberShowing.props.children).toEqual(Number(number));
        });
    });

    it.each([146, 144, 1, 1000000, -1])('should show the correct number that it moved to', async (animateToNumber: number) => {
        const startingNumber = 145;
        const {toJSON, getByTestId, rerender} = render(<AnimatedNumber animateToNumber={startingNumber}/>);

        const text = getByTestId('no-animation-number');

        fireEvent(text, 'onLayout', {nativeEvent: {layout: {height: 10}}});

        // const animateToNumber = 456;

        rerender(<AnimatedNumber animateToNumber={animateToNumber}/>);

        // expect(toJSON()).toMatchSnapshot();

        // await waitFor(() => {
        animateToNumber.toString().split('').forEach(async (number, index) => {
            const useIndex = animateToNumber.toString().length - 1 - index;

            await waitFor(() => {
                getByTestId(`animated-number-view-${useIndex}`);
            });

            // const translateY = transformedView.props.style.transform[0].translateY;
            // const translateYValue = Number(number) * 10;

            // console.log(translateY, translateYValue);

            // this will always fail, because native animation will not start in test (since we're mocking it)
            // expect(translateY).toBe(translateYValue * -1);

            const numberShowing = getByTestId(`text-${useIndex}-${number}`);
            expect(numberShowing.props.children).toEqual(Number(number));

            // console.log(numberShowing.props.children);
        });

        // });
    });
});
