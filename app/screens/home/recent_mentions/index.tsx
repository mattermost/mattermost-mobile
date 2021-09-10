// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useRoute} from '@react-navigation/native';
import React from 'react';
import {Text} from 'react-native';
import Animated, {AnimatedLayout, FadeInLeft, FadeInRight} from 'react-native-reanimated';
import {SafeAreaView} from 'react-native-safe-area-context';

const RecentMentionsScreen = () => {
    const route = useRoute();
    const params = route.params! as {direction: string};
    const entering = params.direction === 'left' ? FadeInLeft : FadeInRight;

    return (
        <SafeAreaView
            style={{flex: 1, backgroundColor: 'brown'}}
        >
            <AnimatedLayout style={{flex: 1}}>
                <Animated.View
                    entering={entering.duration(150)}
                    style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}
                >
                    <Text style={{fontSize: 20, color: '#fff'}}>{'Recent Mentions Screen'}</Text>
                </Animated.View>
            </AnimatedLayout>
        </SafeAreaView>
    );
};

export default RecentMentionsScreen;
