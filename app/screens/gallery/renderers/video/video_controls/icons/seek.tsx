// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {useImperativeHandle, forwardRef} from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import Svg, {G, Path, Text as SvgText} from 'react-native-svg';

type Props = {
    size?: number;
    color?: string;
    seekSeconds: 0 | 10 | 30;
    type: 'fastForward' | 'rewind';
}

export interface SeekIconRef {
    triggerSpin: () => void;
}

const styles = StyleSheet.create({
    absolute: {
        position: 'absolute',
    },
});

const SeekIcon = forwardRef<SeekIconRef, Props>(({
    size = 38,
    color = 'white',
    seekSeconds,
    type,
}, ref) => {
    const rotation = useSharedValue(0);

    useImperativeHandle(ref, () => ({
        triggerSpin: () => {
            rotation.value = 0; // Reset immediately
            // Spin in the correct direction based on type
            const targetRotation = type === 'fastForward' ? 360 : -360;
            rotation.value = withTiming(targetRotation, {
                duration: 600,
                easing: Easing.out(Easing.cubic),
            // eslint-disable-next-line max-nested-callbacks
            }, () => {
                rotation.value = 0; // Reset after animation
            });
        },
    }));

    if (!seekSeconds) {
        return null;
    }

    const strokeWidth = size * 0.09;
    const center = size / 2;
    const radius = center - (strokeWidth / 2);
    const gapDegrees = 35;

    // Calculate start and end angles based on type
    const [startAngle, endAngle, baseRotation] = type === 'fastForward' ? [
        ((360 - (gapDegrees / 2)) * (Math.PI / 180)),
        ((gapDegrees / 2) * (Math.PI / 180)),
        45,
    ] : [
        ((gapDegrees / 2) * (Math.PI / 180)),
        ((360 - (gapDegrees / 2)) * (Math.PI / 180)),
        -45,
    ];

    const startX = center + (radius * Math.cos(startAngle - (Math.PI / 2)));
    const startY = center + (radius * Math.sin(startAngle - (Math.PI / 2)));
    const endX = center + (radius * Math.cos(endAngle - (Math.PI / 2)));
    const endY = center + (radius * Math.sin(endAngle - (Math.PI / 2)));

    const tangentDegrees = (startAngle * 180) / Math.PI;
    const arrowLength = size * 0.25;

    const arcPath = type === 'fastForward'? `M ${startX} ${startY} A ${radius} ${radius} 0 1 0 ${endX} ${endY}`: `M ${endX} ${endY} A ${radius} ${radius} 0 1 0 ${startX} ${startY}`;

    const arrowRotation = type === 'fastForward' ? tangentDegrees : tangentDegrees + 180;
    const arrowPointX = startX;
    const arrowPointY = startY;

    // Animated style for the spinning arc container only
    const spinStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${rotation.value}deg`}],
    }));

    return (
        <View style={{width: size, height: size}}>
            {/* Spinning arc and arrow */}
            <Animated.View style={[styles.absolute, spinStyle]}>
                <Svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                >
                    <G transform={`rotate(${baseRotation}, ${center}, ${center})`}>
                        <Path
                            d={arcPath}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            fill='none'
                            strokeLinecap='round'
                        />

                        <G transform={`rotate(${arrowRotation}, ${arrowPointX}, ${arrowPointY})`}>
                            <Path
                                d={`M ${arrowPointX + (arrowLength - 5)} ${arrowPointY} l -${arrowLength} -${arrowLength / 2} l 0 ${arrowLength} Z`}
                                strokeWidth={strokeWidth * 3}
                                fill={color}
                            />
                        </G>
                    </G>
                </Svg>
            </Animated.View>

            {/* Static text - no animation at all */}
            <View style={styles.absolute}>
                <Svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                >
                    <SvgText
                        x={center}
                        y={center + (size * 0.03)}
                        fontSize={size * 0.45}
                        fontWeight='bold'
                        fill={color}
                        textAnchor='middle'
                        alignmentBaseline='middle'
                    >
                        {seekSeconds}
                    </SvgText>
                </Svg>
            </View>
        </View>
    );
});

SeekIcon.displayName = 'SeekIcon';

export default SeekIcon;
