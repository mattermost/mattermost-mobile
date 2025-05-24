// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {ScrollView, View, useWindowDimensions, type LayoutChangeEvent} from 'react-native';
import Animated from 'react-native-reanimated';

import Markdown from '@components/markdown';
import ShowMoreButton from '@components/post_list/post/body/message/show_more_button';
import {useTheme} from '@context/theme';
import {useShowMoreAnimatedStyle} from '@hooks/show_more';
import {getMarkdownBlockStyles, getMarkdownTextStyles} from '@utils/markdown';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {UserMentionKey} from '@typings/global/markdown';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    post: DraftModel | ScheduledPostModel;
    layoutWidth: number;
    location: AvailableScreens;
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

const DraftAndScheduledPostMessage: React.FC<Props> = ({
    post,
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
    const onPress = useCallback(() => setOpen(!open), [open]);

    return (
        <>
            <Animated.View
                style={animatedStyle}
                testID='draft_message'
            >
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
                            channelId={post.channelId}
                            layoutWidth={layoutWidth}
                            location={location}
                            postId={post.id}
                            textStyles={textStyles}
                            value={post.message}
                            mentionKeys={EMPTY_MENTION_KEYS}
                            theme={theme}
                            imagesMetadata={post.metadata?.images}
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

export default DraftAndScheduledPostMessage;
