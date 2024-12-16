// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Animated, DeviceEventEmitter, TouchableWithoutFeedback} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';

import CompassIcon from '@components/compass_icon';
import Draft from '@components/draft';
import FormattedText from '@components/formatted_text';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {deleteDraftConfirmation} from '@utils/draft';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type DraftModel from '@typings/database/models/servers/draft';

type Props = {
    item: DraftModel;
    location: string;
    layoutWidth: number;
}

const getStyles = makeStyleSheetFromTheme((theme) => {
    return {
        deleteContainer: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.dndIndicator,
            paddingHorizontal: 24,
            paddingVertical: 16,
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

const SwipeableDraft: React.FC<Props> = ({
    item,
    location,
    layoutWidth,
}) => {
    const swipeable = useRef<Swipeable>(null);
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyles(theme);
    const serverUrl = useServerUrl();

    const onSwipeableWillOpen = useCallback(() => {
        DeviceEventEmitter.emit(Events.DRAFT_SWIPEABLE, item.id);
    }, [item.id]);

    const deleteDraft = useCallback(() => {
        deleteDraftConfirmation({
            intl,
            serverUrl,
            channelId: item.channelId,
            rootId: item.rootId,
            swipeable,
        });
    }, [intl, item.channelId, item.rootId, serverUrl]);

    const renderAction = useCallback((progress: Animated.AnimatedInterpolation<number>) => {
        const trans = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layoutWidth + 40, 0],
            extrapolate: 'clamp',
        });

        return (
            <TouchableWithoutFeedback
                onPress={deleteDraft}
            >
                <Animated.View style={{transform: [{translateX: trans}], ...styles.deleteContainer}}>
                    <CompassIcon
                        color={theme.sidebarText}
                        name='trash-can-outline'
                        size={18}
                    />
                    <FormattedText
                        id='draft.options.delete.title'
                        defaultMessage={'Delete draft'}
                        style={styles.deleteText}
                    />
                </Animated.View>
            </TouchableWithoutFeedback>
        );
    }, [deleteDraft, layoutWidth, styles.deleteContainer, styles.deleteText, theme.sidebarText]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(Events.DRAFT_SWIPEABLE, (draftId: string) => {
            if (item.id !== draftId) {
                swipeable.current?.close();
            }
        });

        return () => listener.remove();
    }, [item.id]);

    return (
        <Swipeable
            renderRightActions={renderAction}
            rightThreshold={40}
            ref={swipeable}
            onSwipeableWillOpen={onSwipeableWillOpen}
            childrenContainerStyle={{flex: 1}}
            testID='draft_swipeable'
        >
            <Draft
                key={item.id}
                channelId={item.channelId}
                draft={item}
                location={location}
                layoutWidth={layoutWidth}
            />
        </Swipeable>
    );
};

export default SwipeableDraft;
