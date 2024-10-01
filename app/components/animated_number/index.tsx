// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
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
    animationDuration,
    fontStyle,
    easing = 1.2,
}: Props) => {
    const prevNumber = usePrevious(animateToNumber);
    const animateToNumberString = String(Math.abs(animateToNumber));
    const prevNumberString = String(Math.abs(prevNumber));

    const [numberHeight, setNumberHeight] = React.useState(0);
    const animations = useMemo(() => {
        if (numberHeight === 0) {
            return [];
        }
        const numberStringToDigitsArray = Array.from(animateToNumberString, Number);
        const prevNumberersArr = Array.from(prevNumberString, Number);

        return numberStringToDigitsArray.map((digit, index) => {
            // Skip animation if the current and previous digits are the same
            if (prevNumberersArr[index] === digit) {
                return new Animated.Value(-1 * (numberHeight * digit));
            }

            const prevHeight = -1 * (numberHeight * (prevNumberersArr[index] || 0));
            const animation = new Animated.Value(prevHeight);

            Animated.timing(animation, {
                toValue: -1 * (numberHeight * digit),
                duration: animationDuration,
                useNativeDriver: true,
                easing: Easing.elastic(easing),
            }).start();

            return animation;
        });
    }, [animateToNumberString, prevNumber, numberHeight, animationDuration, easing]);

    const setButtonLayout = useCallback((e: LayoutChangeEvent) => {
        setNumberHeight(e.nativeEvent.layout.height);
    }, []);

    return (
        <>
            {numberHeight !== 0 && (
                <View style={{flexDirection: 'row'}}>
                    {animateToNumber < 0 && (
                        <Text style={[fontStyle, {height: numberHeight}]}>{'-'}</Text>
                    )}
                    {Array.from(animateToNumberString, Number).map((_, index) => (
                        <View
                            // eslint-disable-next-line react/no-array-index-key
                            key={index}
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
                            >
                                {NUMBERS.map((number) => (
                                    <View
                                        key={number}
                                        style={{flexDirection: 'row'}}
                                    >
                                        <Text style={[fontStyle, {height: numberHeight}]}>
                                            {number}
                                        </Text>
                                    </View>
                                ))}
                            </Animated.View>
                        </View>
                    ))}
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
