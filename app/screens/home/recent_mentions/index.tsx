// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useRoute} from '@react-navigation/native';
import React, {useCallback, useState} from 'react';
import {Text} from 'react-native';
import Animated, {useAnimatedStyle, withTiming} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

const RecentMentionsScreen = () => {
    const route = useRoute();
    const params = route.params! as {direction: string};
    const toLeft = params.direction === 'left';
    const [start, setStart] = useState(false);

    const onLayout = useCallback(() => {
        setStart(true);
    }, []);

    const animated = useAnimatedStyle(() => {
        if (start) {
            return {
                opacity: withTiming(1, {duration: 150}),
                transform: [{translateX: withTiming(0, {duration: 150})}],
            };
        }

        return {
            opacity: withTiming(0, {duration: 150}),
            transform: [{translateX: withTiming(toLeft ? -25 : 25, {duration: 150})}],
        };
    }, [start]);

    return (
        <SafeAreaView
            style={{flex: 1, backgroundColor: 'brown'}}
        >
            <Animated.View
                onLayout={onLayout}
                style={[{flex: 1, justifyContent: 'center', alignItems: 'center'}, animated]}
            >
                <Text style={{fontSize: 20, color: '#fff'}}>{'Recent Mentions Screen'}</Text>
            </Animated.View>
        </SafeAreaView>
    );
};

export default RecentMentionsScreen;
