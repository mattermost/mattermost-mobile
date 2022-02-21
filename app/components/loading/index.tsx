// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import LottieView from 'lottie-react-native';
import React, {useEffect, useRef} from 'react';
import {StyleSheet, View, ViewStyle} from 'react-native';

type LoadingProps = {
    containerStyle?: ViewStyle;
    style?: ViewStyle;
    color?: string;
}

const Loading = ({containerStyle, style, color}: LoadingProps) => {
    const lottieRef = useRef<LottieView|null>(null);

    // This is a workaround as it seems that autoPlay does not work properly on
    // newer versions of RN
    useEffect(() => {
        const animationFrame = requestAnimationFrame(() => {
            lottieRef.current?.reset();
            lottieRef.current?.play();
        });

        return () => cancelAnimationFrame(animationFrame);
    }, []);

    return (
        <View style={containerStyle}>
            <LottieView
                autoPlay={true}
                colorFilters={color ? [{color, keypath: 'Shape Layer 1'}] : undefined}
                loop={true}
                ref={lottieRef}
                source={require('./spinner.json')}
                style={[styles.lottie, style]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    lottie: {
        height: 32,
        width: 32,
    },
});

export default Loading;
