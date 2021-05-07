// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {TouchableHighlight, Text, View} from 'react-native';
import type {Theme} from '@mm-redux/types/preferences';
import {useDispatch, useSelector} from 'react-redux';
import {getTheme} from '@mm-redux/selectors/entities/preferences';
import type {GlobalState} from '@mm-redux/types/store';

import EventEmitter from '@mm-redux/utils/event_emitter';
import {NavigationTypes} from '@constants';
import CompassIcon from '@components/compass_icon';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {getViewingGlobalThreads} from '@selectors/threads';
import {getThreads} from '@mm-redux/actions/threads';
import {handleViewingGlobalThreadsScreen} from '@actions/views/threads';
import {getCurrentTeamId} from '@mm-redux/selectors/entities/teams';
import {getCurrentUserId} from '@mm-redux/selectors/entities/users';

const ThreadsSidebarEntry = () => {
    const viewingGlobalThreads = useSelector(getViewingGlobalThreads);
    const theme = useSelector((state: GlobalState) => getTheme(state));
    const currentUserId = useSelector((state: GlobalState) => getCurrentUserId(state));
    const currentTeamId = useSelector((state: GlobalState) => getCurrentTeamId(state));

    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(getThreads(currentUserId, currentTeamId, '', '', 200, false));
    });

    const onPress = preventDoubleTap(() => {
        EventEmitter.emit(NavigationTypes.CLOSE_MAIN_SIDEBAR);
        dispatch(handleViewingGlobalThreadsScreen());
    });

    const style = getStyleSheet(theme);
    let extraItemStyle;
    let extraTextStyle;

    if (viewingGlobalThreads) {
        extraItemStyle = style.itemActive;
        extraTextStyle = style.textActive;
    }

    return (
        <TouchableHighlight
            underlayColor={changeOpacity(theme.sidebarTextHoverBg, 0.5)}
            onPress={onPress}
        >
            <View style={style.container} >
                <View style={[style.item, extraItemStyle]} >
                    <View style={style.iconContainer}>
                        <CompassIcon
                            name='message-text-outline'
                            style={style.icon}
                        />
                    </View>
                    <Text
                        style={[style.text, extraTextStyle]}
                        ellipsizeMode='tail'
                        numberOfLines={1}
                    >
                        {'Threads'}
                    </Text>
                </View>
            </View>
        </TouchableHighlight>
    );
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 1,
            flexDirection: 'row',
            height: 44,
        },
        item: {
            alignItems: 'center',
            flex: 1,
            flexDirection: 'row',
            paddingLeft: 16,
        },
        itemActive: {
            backgroundColor: changeOpacity(theme.sidebarTextActiveColor, 0.1),
        },
        text: {
            color: changeOpacity(theme.sidebarText, 0.6),
            fontSize: 16,
            lineHeight: 24,
            paddingRight: 10,
            maxWidth: '80%',
            flex: 1,
            alignSelf: 'center',
            fontFamily: 'Open Sans',
        },
        textActive: {
            color: theme.sidebarTextActiveColor,
        },
        icon: {
            color: changeOpacity(theme.sidebarText, 0.4),
            fontSize: 16,
        },
        iconContainer: {
            marginRight: 8,
            alignItems: 'center',
        },
    };
});

export default ThreadsSidebarEntry;
