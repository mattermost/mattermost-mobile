// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Animated, Easing, type LayoutChangeEvent, type StyleProp, Text, type TextStyle, View} from 'react-native';

interface Props {
    animateToNumber: number;
    fontStyle?: StyleProp<TextStyle>;
    animationDuration?: number;
    easing?: ((input: number) => number) | undefined;
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
    animationDuration,
    fontStyle,
    easing,
}: Props) => {
    const prevNumber = usePrevious(animateToNumber);
    const animateToNumberString = String(Math.abs(animateToNumber));
    const prevNumberString = String(Math.abs(prevNumber));

    const numberStringToDigitsArray = Array.from(animateToNumberString, Number);
    const prevNumberersArr = Array.from(prevNumberString, Number);

    const [numberHeight, setNumberHeight] = React.useState(0);
    const animations = useMemo(() => numberStringToDigitsArray.map((__, index) => {
        if (typeof prevNumberersArr[index] !== 'number') {
            return new Animated.Value(0);
        }

        const animationHeight = -1 * (numberHeight * prevNumberersArr[index]);
        return new Animated.Value(animationHeight);
    }), [numberStringToDigitsArray]);

    const setButtonLayout = useCallback((e: LayoutChangeEvent) => {
        setNumberHeight(e.nativeEvent.layout.height);
    }, []);

    React.useEffect(() => {
        animations.forEach((animation, index) => {
            Animated.timing(animation, {
                toValue: -1 * (numberHeight * numberStringToDigitsArray[index]),
                duration: animationDuration || 1400,
                useNativeDriver: true,
                easing: easing || Easing.elastic(1.2),
            }).start();
        });
    }, [animateToNumber, animationDuration, fontStyle, numberHeight]);

    const getTranslateY = (index: number) => {
        return animations[index];
    };

    return (
        <>
            {numberHeight !== 0 && (
                <View style={{flexDirection: 'row'}}>
                    {animateToNumber < 0 && (
                        <Text style={[fontStyle, {height: numberHeight}]}>{'-'}</Text>
                    )}
                    {numberStringToDigitsArray.map((n, index) => {
                        return (
                            <View
                                key={`${index.toString()}`}
                                style={{height: numberHeight, overflow: 'hidden'}}
                            >
                                <Animated.View
                                    style={[
                                        {
                                            transform: [
                                                {
                                                    translateY: getTranslateY(index),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    {NUMBERS.map((number, i) => (
                                        <View
                                            style={{flexDirection: 'row'}}
                                            key={`${i.toString()}`}
                                        >
                                            <Text style={[fontStyle, {height: numberHeight}]}>
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
            >
                {animateToNumberString}
            </Text>
            }
        </>
    );
};

export default AnimatedNumber;
