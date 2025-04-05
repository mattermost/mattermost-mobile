// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {type LayoutChangeEvent, useWindowDimensions, ScrollView, type StyleProp, StyleSheet, type TextStyle, View} from 'react-native';
import Animated from 'react-native-reanimated';

import Markdown from '@components/markdown';
import ShowMoreButton from '@components/post_list/post/body/message/show_more_button';
import {useShowMoreAnimatedStyle} from '@hooks/show_more';

import type {MarkdownBlockStyles, MarkdownTextStyles} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    baseTextStyle: StyleProp<TextStyle>;
    blockStyles?: MarkdownBlockStyles;
    channelId: string;
    hasThumbnail?: boolean;
    location: AvailableScreens;
    metadata?: PostMetadata | null;
    textStyles?: MarkdownTextStyles;
    theme: Theme;
    value?: string;
}

const SHOW_MORE_HEIGHT = 54;
const style = StyleSheet.create({
    container: {
        paddingRight: 12,
    },
});

const AttachmentText = ({baseTextStyle, blockStyles, channelId, hasThumbnail, location, metadata, textStyles, theme, value}: Props) => {
    const [open, setOpen] = useState(false);
    const [height, setHeight] = useState<number|undefined>();
    const dimensions = useWindowDimensions();
    const maxHeight = Math.round((dimensions.height * 0.4) + SHOW_MORE_HEIGHT);
    const animatedStyle = useShowMoreAnimatedStyle(height, maxHeight, open);

    const onLayout = useCallback((event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height), []);
    const onPress = () => setOpen(!open);

    return (
        <View style={hasThumbnail && style.container}>
            <Animated.View style={animatedStyle}>
                <ScrollView
                    keyboardShouldPersistTaps={'always'}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <View onLayout={onLayout}>
                        <Markdown
                            channelId={channelId}
                            location={location}
                            baseTextStyle={baseTextStyle}
                            textStyles={textStyles}
                            blockStyles={blockStyles}
                            disableGallery={true}
                            imagesMetadata={metadata?.images}
                            value={value}
                            theme={theme}
                        />
                    </View>
                </ScrollView>
            </Animated.View>
            {(height || 0) > maxHeight &&
            <ShowMoreButton
                highlight={false}
                theme={theme}
                showMore={!open}
                onPress={onPress}
            />
            }
        </View>
    );
};

export default AttachmentText;
