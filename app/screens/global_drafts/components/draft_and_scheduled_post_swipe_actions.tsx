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
import {DRAFT_TYPE_DRAFT, DRAFT_TYPE_SCHEDULED, type DraftType} from '@constants/draft';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {deleteDraftConfirmation} from '@utils/draft';
import {deleteScheduledPostConfirmation} from '@utils/scheduled_post';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type DraftModel from '@typings/database/models/servers/draft';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    draftType: DraftType;
    item: DraftModel | ScheduledPostModel;
    location: AvailableScreens;
    layoutWidth: number;
    firstItem?: boolean;
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

function RightAction({deletePost, drag, draftType}: { deletePost: () => void; draftType: DraftType; drag: SharedValue<number> }) {
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
                    {draftType === DRAFT_TYPE_DRAFT ? (
                        <FormattedText
                            id='draft.options.delete.title'
                            defaultMessage={'Delete draft'}
                            style={styles1.deleteText}
                        />
                    ) : (
                        <FormattedText
                            id='scheduled_post.options.delete.title'
                            defaultMessage={'Delete'}
                            style={styles1.deleteText}
                        />
                    )
                    }
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
    firstItem,
}) => {
    const swipeable = useRef<SwipeableMethods>(null);
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const onSwipeableOpenStartDrag = useCallback(() => {
        DeviceEventEmitter.emit(Events.DRAFT_SWIPEABLE, item.id);
    }, [item.id]);

    const deletePost = useCallback(() => {
        if (draftType === DRAFT_TYPE_SCHEDULED) {
            deleteScheduledPostConfirmation({
                intl,
                serverUrl,
                scheduledPostId: item.id,
                swipeable,
            });
            return;
        }
        deleteDraftConfirmation({
            intl,
            serverUrl,
            channelId: item.channelId,
            rootId: item.rootId,
            swipeable,
        });
    }, [draftType, intl, serverUrl, item.channelId, item.rootId, item.id]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.DRAFT_SWIPEABLE, (draftId: string) => {
            if (item.id !== draftId) {
                swipeable.current?.close();
            }
        });

        return () => listener.remove();
    }, [item.id]);

    return (
        <GestureHandlerRootView>
            <ReanimatedSwipeable
                childrenContainerStyle={{flex: 1}}
                rightThreshold={20}
                renderRightActions={(_, drag) => (
                    <RightAction
                        deletePost={deletePost}
                        drag={drag}
                        draftType={draftType}
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
                    firstItem={firstItem}
                />
            </ReanimatedSwipeable>
        </GestureHandlerRootView>
    );
};

export default DraftAndScheduledPostSwipeActions;
