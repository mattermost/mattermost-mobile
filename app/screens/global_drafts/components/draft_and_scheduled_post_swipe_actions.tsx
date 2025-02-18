// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {DeviceEventEmitter, Pressable, View} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import ReanimatedSwipeable, {type SwipeableMethods} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {useAnimatedStyle, useSharedValue, type SharedValue} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import DraftAndSchedulePost from '@components/draft_scheduled_post';
import FormattedText from '@components/formatted_text';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {deleteDraftConfirmation} from '@utils/draft';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '../constants';

import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

type Props = {
    draftType: DraftType;
    item: DraftModel | ScheduledPostModel;
    location: string;
    layoutWidth: number;
}

const getStyles = makeStyleSheetFromTheme((theme) => {
    return {
        deleteContainer: {
            backgroundColor: theme.dndIndicator,
        },
        pressableContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
            paddingVertical: 16,
            height: '100%',
        },
        deleteText: {
            color: theme.sidebarText,
            ...typography('Body'),
        },
        deleteIcon: {
            color: theme.sidebarText,
            ...typography('Heading'),
        },
    };
});

function RightAction({deletePost, drag}: { deletePost: () => void; drag: SharedValue<number> }) {
    const theme = useTheme();
    const styles1 = getStyles(theme);
    const containerWidth = useSharedValue(0);
    const [isReady, setIsReady] = useState(false); // flag is use to prevent the jerky animation before calculating the container width
    const styleAnimation = useAnimatedStyle(() => {
        return {
            transform: [{translateX: drag.value + containerWidth.value}],
            opacity: isReady ? 1 : 0,
        };
    });

    const handleLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
        const width = event.nativeEvent.layout.width;
        containerWidth.value = width;
        setIsReady(true);
    };

    return (
        <Reanimated.View
            style={[styleAnimation, styles1.deleteContainer]}
            onLayout={handleLayout}
        >
            <Pressable
                onPress={deletePost}
            >
                <View
                    style={styles1.pressableContainer}
                >
                    <CompassIcon
                        color={theme.sidebarText}
                        name='trash-can-outline'
                        size={18}
                        onPress={deletePost}
                    />
                    <FormattedText
                        id='draft.options.delete.title'
                        defaultMessage={'Delete draft'}
                        style={styles1.deleteText}
                    />
                </View>
            </Pressable>
        </Reanimated.View>
    );
}

const DraftAndScheduledPostSwipeActions: React.FC<Props> = ({
    draftType,
    item,
    location,
    layoutWidth,
}) => {
    const swipeable = useRef<SwipeableMethods>(null);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onSwipeableOpenStartDrag = useCallback(() => {
        DeviceEventEmitter.emit(Events.DRAFT_SWIPEABLE, item.id);
    }, [item.id]);

    const deletePost = useCallback(() => {
        if (draftType === DRAFT_TYPE_SCHEDULED) {
            // TODO: Add swipeable delete for schedule post
            return;
        }
        deleteDraftConfirmation({
            intl,
            serverUrl,
            channelId: item.channelId,
            rootId: item.rootId,
            swipeable,
        });
    }, [intl, item.channelId, item.rootId, draftType, serverUrl]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.DRAFT_SWIPEABLE, (draftId: string) => {
            if (item.id !== draftId && draftType === DRAFT_TYPE_DRAFT) {
                swipeable.current?.close();
            }
        });

        //TODO: Add listener for scheduled post

        return () => listener.remove();
    }, [item.id, draftType]);

    return (
        <GestureHandlerRootView>
            <ReanimatedSwipeable
                childrenContainerStyle={{flex: 1}}
                rightThreshold={20}
                renderRightActions={(_, drag) => (
                    <RightAction
                        deletePost={deletePost}
                        drag={drag}
                    />
                )}
                ref={swipeable}
                onSwipeableOpenStartDrag={onSwipeableOpenStartDrag}
                testID='draft_scheduled_post_swipeable'
            >
                <DraftAndSchedulePost
                    draftType={draftType}
                    key={item.id}
                    channelId={item.channelId}
                    post={item}
                    location={location}
                    layoutWidth={layoutWidth}
                />
            </ReanimatedSwipeable>
        </GestureHandlerRootView>
    );
};

export default DraftAndScheduledPostSwipeActions;
