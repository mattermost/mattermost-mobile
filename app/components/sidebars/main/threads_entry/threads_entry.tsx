// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {TouchableHighlight, Text, View} from 'react-native';
import {injectIntl, intlShape} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';

import {handleViewingGlobalThreadsScreen} from '@actions/views/threads';
import {NavigationTypes} from '@constants';
import CompassIcon from '@components/compass_icon';
import {getStyleSheet} from '@components/sidebars/main/channels_list/channel_item/channel_item';

import {getThreads} from '@mm-redux/actions/threads';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getTeamThreadCounts} from '@mm-redux/selectors/entities/threads';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';
import type {Theme} from '@mm-redux/types/preferences';
import type {GlobalState} from '@mm-redux/types/store';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {getViewingGlobalThreads} from '@selectors/threads';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity} from '@utils/theme';
import {makeStyleFromTheme} from '@mm-redux/utils/theme_utils';
import Badge from '@components/badge';

type Props = {
    intl: typeof intlShape;
};

const ThreadsSidebarEntry = ({intl}: Props) => {
    const viewingGlobalThreads = useSelector(getViewingGlobalThreads);
    const theme = useSelector((state: GlobalState) => getTheme(state));
    const currentUserId = useSelector((state: GlobalState) => getCurrentUserId(state));
    const currentTeamId = useSelector((state: GlobalState) => getCurrentTeamId(state));

    const threadCount = useSelector((state:GlobalState) => getTeamThreadCounts(state, currentTeamId));

    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getThreads(currentUserId, currentTeamId, '', '', 200, false));
    }, []);

    const onPress = preventDoubleTap(() => {
        EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
        dispatch(getThreads(currentUserId, currentTeamId, '', '', 200, false));
        dispatch(handleViewingGlobalThreadsScreen());
    });

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
        <TouchableHighlight
            underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            onPress={onPress}
        >
            <View style={style.container} >
                {border}
                <View style={itemStyle} >
                    <View style={extraStyle.iconContainer}>
                        <CompassIcon
                            name='message-text-outline'
                            style={iconStyle}
                        />
                    </View>
                    <Text
                        style={textStyle}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        {intl.formatMessage({
                            id: 'threads',
                            defaultMessage: 'Threads',
                        })}
                    </Text>
                    {badge}
                </View>
            </View>
        </TouchableHighlight>
    );
};

const getExtraStyleSheet = makeStyleFromTheme((theme: Theme) => {
    return {
        iconContainer: {
            marginRight: 8,
            alignItems: 'center',
        },
        icon: {
            color: changeOpacity(theme.sidebarText, 0.4),
            fontSize: 16,
        },
        iconActive: {
            color: theme.sidebarText,
        },
    };
});

// const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
//     return {
//         container: {
//             flex: 1,
//             flexDirection: 'row',
//             height: 44,
//         },
//         borderActive: {
//             backgroundColor: theme.sidebarTextActiveBorder,
//             width: 5,
//         },
//         item: {
//             alignItems: 'center',
//             flex: 1,
//             flexDirection: 'row',
//             paddingLeft: 16,
//         },
//         itemActive: {
//             backgroundColor: changeOpacity(theme.sidebarTextActiveColor, 0.1),
//         },
//         text: {
//             color: changeOpacity(theme.sidebarText, 0.6),
//             fontSize: 16,
//             lineHeight: 24,
//             paddingRight: 10,
//             maxWidth: '80%',
//             flex: 1,
//             alignSelf: 'center',
//             fontFamily: 'Open Sans',
//         },
//         textActive: {
//             color: theme.sidebarTextActiveColor,
//         },
//         icon: {
//             color: changeOpacity(theme.sidebarText, 0.4),
//             fontSize: 16,
//         },
//         iconContainer: {
//             marginRight: 8,
//             alignItems: 'center',
//         },
//     };
// });

export default injectIntl(ThreadsSidebarEntry);
