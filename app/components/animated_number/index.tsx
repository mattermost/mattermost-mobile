// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Animated, Easing, type LayoutChangeEvent, type StyleProp, Text, type TextStyle, View} from 'react-native';

interface Props {
    animateToNumber: number;
    fontStyle?: StyleProp<TextStyle>;
    animationDuration?: number;
    easing?: number;
  }

const NUMBERS = Array(10).fill(null).map((_, i) => i);

const usePrevious = (value: number) => {
    const ref = React.useRef<number>(value);
    React.useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
};

const AnimatedNumber = ({
    animateToNumber,
    animationDuration = 1400,
    fontStyle,
    easing = 1.2,
}: Props) => {
    const previousNumber = usePrevious(animateToNumber);
    const [numberHeight, setNumberHeight] = useState(0);

    const animateToNumberString = String(Math.abs(animateToNumber));

    const previousNumberString = useMemo(() => {
        // comparing previousNumber and animateToNumber gets trickier when the number of digits changes and the length differs.
        // By padding the previousNumber with 0s, or slicing the previousNumber to match the length of animateToNumber
        // we can compare them digit by digit
        const _previousNumberString = String(Math.abs(previousNumber)).padStart(
            animateToNumberString.length,
            '0',
        );

        if (_previousNumberString.length > animateToNumberString.length) {
            _previousNumberString.slice(_previousNumberString.length - animateToNumberString.length);
        }

        return _previousNumberString;
    }, [animateToNumberString, previousNumber]);

    const animations = useMemo(() => {
        const animateToNumberArray = Array.from(animateToNumberString, Number);

        if (!numberHeight) {
            return animateToNumberArray.map(() => new Animated.Value(0));
        }

        const previousNumberArray = Array.from(previousNumberString, Number);

        return animateToNumberArray.map((_, index) => {
            const useDigit = previousNumberArray[index] === animateToNumberArray[index] ? animateToNumberArray[index] : previousNumberArray[index];

            return new Animated.Value(-1 * (numberHeight * useDigit));
        });
    }, [animateToNumberString, numberHeight, previousNumberString]);

    useEffect(() => {
        if (!numberHeight) {
            return;
        }

        const animateToNumberArray = Array.from(animateToNumberString, Number);
        animations.forEach((animation, index) => {
            Animated.timing(animation, {
                toValue: -1 * (numberHeight * animateToNumberArray[index]),
                duration: animationDuration,
                useNativeDriver: true,
                easing: Easing.elastic(easing),
            }).start();
        });
    }, [
        animateToNumberString,
        animationDuration,
        animations,
        easing,
        numberHeight,
    ]);

    const setButtonLayout = useCallback((e: LayoutChangeEvent) => {
        setNumberHeight(e.nativeEvent.layout.height);
    }, []);

    return (
        <>
            {numberHeight !== 0 && (
                <View
                    style={{flexDirection: 'row'}}
                    testID='animation-number-main'
                >
                    {animateToNumber < 0 && (
                        <Text style={[fontStyle, {height: numberHeight}]}>{'-'}</Text>
                    )}
                    {Array.from(animateToNumberString, Number).map((_, index) => {
                        const useIndex = animateToNumberString.length - 1 - index;
                        return (
                            <View
                                key={useIndex}
                                style={{height: numberHeight, overflow: 'hidden'}}
                            >
                                <Animated.View
                                    style={{
                                        transform: [
                                            {
                                                translateY: animations[index],
                                            },
                                        ],
                                    }}
                                    testID={`animated-number-view-${useIndex}`}
                                >
                                    {NUMBERS.map((number, i) => (
                                        <View
                                            key={`${NUMBERS.length - 1 - i}`}
                                            style={{flexDirection: 'row'}}
                                        >
                                            <Text
                                                style={[fontStyle, {height: numberHeight}]}
                                                testID={`text-${useIndex}-${number}`}
                                            >
                                                {number}
                                            </Text>
                                        </View>
                                    ))}
                                </Animated.View>
                            </View>
                        );
                    })}
                </View>
            )}
            {numberHeight === 0 &&
            <Text
                style={[fontStyle]}
                onLayout={setButtonLayout}
                testID={'no-animation-number'}
            >
                {animateToNumberString}
            </Text>
            }
        </>
    );
};

export default AnimatedNumber;
