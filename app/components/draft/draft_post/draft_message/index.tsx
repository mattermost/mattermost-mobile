// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {ScrollView, View, useWindowDimensions, type LayoutChangeEvent} from 'react-native';
import Animated from 'react-native-reanimated';

import ShowMoreButton from '@app/components/post_list/post/body/message/show_more_button';
import {useTheme} from '@app/context/theme';
import {useShowMoreAnimatedStyle} from '@app/hooks/show_more';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@app/utils/markdown';
import {makeStyleSheetFromTheme} from '@app/utils/theme';
import {typography} from '@app/utils/typography';
import Markdown from '@components/markdown';

import type {DraftModel} from '@app/database/models/server';
import type {UserMentionKey} from '@typings/global/markdown';

type Props = {
    draft: DraftModel;
    layoutWidth: number;
    location: string;
}

const EMPTY_MENTION_KEYS: UserMentionKey[] = [];
const SHOW_MORE_HEIGHT = 54;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageContainer: {
            width: '100%',
        },
        reply: {
            paddingRight: 10,
        },
        message: {
            color: theme.centerChannelColor,
            ...typography('Body', 200),
        },
        pendingPost: {
            opacity: 0.5,
        },
    };
});

const DraftMessage: React.FC<Props> = ({
    draft,
    layoutWidth,
    location,
}) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const blockStyles = getMarkdownBlockStyles(theme);
    const textStyles = getMarkdownTextStyles(theme);
    const [height, setHeight] = useState<number|undefined>();
    const [open, setOpen] = useState(false);
    const dimensions = useWindowDimensions();
    const maxHeight = Math.round((dimensions.height * 0.5) + SHOW_MORE_HEIGHT);
    const animatedStyle = useShowMoreAnimatedStyle(height, maxHeight, open);

    const onLayout = useCallback((event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height), []);
    const onPress = () => setOpen(!open);

    return (
        <>
            <Animated.View style={animatedStyle}>
                <ScrollView
                    keyboardShouldPersistTaps={'always'}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    <View
                        style={[style.messageContainer]}
                        onLayout={onLayout}
                    >
                        <Markdown
                            baseTextStyle={style.message}
                            blockStyles={blockStyles}
                            channelId={draft.channelId}
                            layoutWidth={layoutWidth}
                            location={location}
                            postId={draft.id}
                            textStyles={textStyles}
                            value={draft.message}
                            mentionKeys={EMPTY_MENTION_KEYS}
                            theme={theme}
                            imagesMetadata={draft.metadata?.images}
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
        </>
    );
};

export default DraftMessage;
