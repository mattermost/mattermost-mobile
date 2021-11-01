// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {TouchableHighlight, View} from 'react-native';

import Badge from '@components/badge';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {getStyleSheet} from '@components/sidebars/main/channels_list/channel_item/channel_item';
import {NavigationTypes} from '@constants';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {makeStyleFromTheme} from '@mm-redux/utils/theme_utils';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';

import type {Team} from '@mm-redux/types/teams';
import type {Theme} from '@mm-redux/types/theme';
import type {ThreadsState} from '@mm-redux/types/threads';
import type {UserProfile} from '@mm-redux/types/users';
import type {$ID} from '@mm-redux/types/utilities';

type Props = {
    actions: {
        getThreads: (currentUserId: $ID<UserProfile>, currentTeamId: $ID<Team>, before: string, after: string, perPage: number, deleted: boolean, unread: boolean) => void;
        handleViewingGlobalThreadsScreen: () => void;
    };
    currentTeamId: $ID<Team>;
    currentUserId: $ID<UserProfile>;
    isUnreadSelected: boolean;
    theme: Theme;
    threadCount: ThreadsState['counts'][$ID<Team>];
    viewingGlobalThreads: boolean;
};

const ThreadsEntry = ({
    actions,
    currentTeamId,
    currentUserId,
    isUnreadSelected,
    theme,
    threadCount,
    viewingGlobalThreads,
}: Props) => {
    useEffect(() => {
        actions.getThreads(currentUserId, currentTeamId, '', '', 5, false, isUnreadSelected);
    }, []);

    const onPress = React.useCallback(preventDoubleTap(() => {
        EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
        actions.handleViewingGlobalThreadsScreen();
    }), []);

    const style = getStyleSheet(theme);
    const extraStyle = getExtraStyleSheet(theme);

    const [itemStyle, textStyle, iconStyle, border, badge] = React.useMemo(() => {
        const item = [style.item];
        const text = [style.text];
        const icon = [extraStyle.icon];
        let borderComponent;
        let badgeComponent;

        if (viewingGlobalThreads) {
            item.push(style.itemActive);
            text.push(style.textActive);
            borderComponent = (
                <View style={style.borderActive}/>
            );
        }

        if (threadCount?.total_unread_threads) {
            text.push(style.textUnread);
        }

        if (viewingGlobalThreads || threadCount?.total_unread_threads) {
            icon.push(extraStyle.iconActive);
        }

        if (threadCount?.total_unread_mentions) {
            badgeComponent = (
                <Badge
                    testID='threads.badge'
                    containerStyle={style.badgeContainer}
                    style={style.badge}
                    countStyle={style.mention}
                    count={threadCount?.total_unread_mentions}
                    minWidth={21}
                    isChannelItem={true}
                />
            );
        }

        return [item, text, icon, borderComponent, badgeComponent];
    }, [extraStyle, style, threadCount?.total_unread_mentions, threadCount?.total_unread_threads, viewingGlobalThreads]);

    return (
        <View style={extraStyle.baseContainer}>
            <TouchableHighlight
                underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
                onPress={onPress}
            >
                <View style={[style.container, extraStyle.container]}>
                    {border}
                    <View style={itemStyle} >
                        <View style={extraStyle.iconContainer}>
                            <CompassIcon
                                name='message-text-outline'
                                style={iconStyle}
                            />
                        </View>
                        <FormattedText
                            id='threads'
                            defaultMessage='Threads'
                            style={textStyle}
                        />
                        {badge}
                    </View>
                </View>
            </TouchableHighlight>
        </View>
    );
};

const getExtraStyleSheet = makeStyleFromTheme((theme: Theme) => {
    return {
        baseContainer: {
            marginTop: 16,
            marginBottom: 4,
        },
        container: {
            flex: 0, // Override the existing flex: 1
        },
        iconContainer: {
            alignItems: 'center',
        },
        icon: {
            color: changeOpacity(theme.sidebarText, 0.4),
            fontSize: 24,
        },
        iconActive: {
            color: theme.sidebarText,
        },
    };
});

export default ThreadsEntry;
