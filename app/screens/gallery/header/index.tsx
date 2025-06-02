// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {type StyleProp, StyleSheet, View, type ViewStyle} from 'react-native';
import Animated, {type AnimatedStyle} from 'react-native-reanimated';
import {SafeAreaView, type Edge, useSafeAreaInsets} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import PressableOpacity from '@components/pressable_opacity';
import {useWindowDimensions} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    index: number;
    onClose: () => void;
    style: StyleProp<AnimatedStyle<ViewStyle>>;
    total: number;
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        backgroundColor: '#000',
        borderBottomColor: changeOpacity('#fff', 0.4),
        borderBottomWidth: 1,
        flexDirection: 'row',
    },
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    title: {
        ...typography('Heading', 300),
        color: 'white',
    },
});

const edges: Edge[] = [];
const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

const Header = ({index, onClose, style, total}: Props) => {
    const insets = useSafeAreaInsets();
    const {width} = useWindowDimensions();
    const height = useDefaultHeaderHeight() - insets.top;
    const topContainerStyle = useMemo(() => [{height: insets.top, backgroundColor: '#000'}], [insets.top]);
    const containerStyle = useMemo(() => [styles.container, {height, paddingHorizontal: insets.left / 2}], [height, insets.left]);
    const iconStyle = useMemo(() => [{width: height}, styles.icon], [height]);
    const titleStyle = useMemo(() => ({width: width - (height * 2)}), [height, width]);
    const titleValue = useMemo(() => ({index: index + 1, total}), [index, total]);

    return (
        <AnimatedSafeAreaView
            edges={edges}
            style={style}
        >
            <Animated.View style={topContainerStyle}/>
            <Animated.View style={containerStyle}>
                <PressableOpacity
                    onPress={onClose}
                    style={iconStyle}
                >
                    <CompassIcon
                        color='white'
                        name='close'
                        size={24}
                    />
                </PressableOpacity>
                <View style={titleStyle}>
                    <FormattedText
                        id='mobile.gallery.title'
                        defaultMessage='{index} of {total}'
                        style={styles.title}
                        values={titleValue}
                    />
                </View>
            </Animated.View>
        </AnimatedSafeAreaView>
    );
};

export default Header;
