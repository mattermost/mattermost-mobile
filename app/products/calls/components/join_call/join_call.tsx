// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {View, Text, Pressable} from 'react-native';

import Avatars from '@components/avatars';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import ViewTypes, {JOIN_CALL_BAR_HEIGHT} from '@constants/view';
import EventEmitter from '@mm-redux/utils/event_emitter';
import leaveAndJoinWithAlert from '@mmproducts/calls/components/leave_and_join_alert';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';
import type {Call} from '@mmproducts/calls/store/types/calls';

type Props = {
    actions: {
        joinCall: (channelId: string) => any;
    };
    theme: Theme;
    call: Call;
    confirmToJoin: boolean;
    alreadyInTheCall: boolean;
    currentChannelName: string;
    callChannelName: string;
    intl: typeof IntlShape;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            backgroundColor: '#3DB887',
            width: '100%',
            padding: 5,
            justifyContent: 'center',
            alignItems: 'center',
            height: JOIN_CALL_BAR_HEIGHT,
        },
        joinCallIcon: {
            color: theme.sidebarText,
            marginLeft: 10,
            marginRight: 5,
        },
        joinCall: {
            color: theme.sidebarText,
            fontWeight: 'bold',
            fontSize: 16,
        },
        started: {
            flex: 1,
            color: theme.sidebarText,
            fontWeight: '400',
            marginLeft: 10,
        },
        avatars: {
            marginRight: 5,
        },
        headerText: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            fontSize: 12,
            fontWeight: '600',
            paddingHorizontal: 16,
            paddingVertical: 0,
            top: 16,
        },
    };
});

const JoinCall = (props: Props) => {
    if (!props.call) {
        return null;
    }

    useEffect(() => {
        EventEmitter.emit(ViewTypes.JOIN_CALL_BAR_VISIBLE, Boolean(props.call && !props.alreadyInTheCall));
        return () => {
            EventEmitter.emit(ViewTypes.JOIN_CALL_BAR_VISIBLE, Boolean(false));
        };
    }, [props.call, props.alreadyInTheCall]);

    const joinHandler = useCallback(() => {
        leaveAndJoinWithAlert(props.intl, props.call.channelId, props.callChannelName, props.currentChannelName, props.confirmToJoin, props.actions.joinCall);
    }, [props.call.channelId, props.callChannelName, props.currentChannelName, props.confirmToJoin, props.actions.joinCall]);

    if (props.alreadyInTheCall) {
        return null;
    }

    const style = getStyleSheet(props.theme);
    const userIds = useMemo(() => {
        return Object.values(props.call.participants || {}).map((x) => x.id);
    }, [props.call.participants]);

    return (
        <Pressable
            style={style.container}
            onPress={joinHandler}
        >
            <CompassIcon
                name='phone-in-talk'
                size={16}
                style={style.joinCallIcon}
            />
            <Text style={style.joinCall}>{'Join Call'}</Text>
            <Text style={style.started}>
                <FormattedRelativeTime
                    value={props.call.startTime}
                    updateIntervalInSeconds={1}
                />
            </Text>
            <View style={style.avatars}>
                <Avatars
                    userIds={userIds}
                    breakAt={1}
                    listTitle={
                        <FormattedText
                            id='calls.join_call.participants_list_header'
                            defaultMessage={'CALL PARTICIPANTS'}
                            style={style.headerText}
                        />
                    }
                />
            </View>
        </Pressable>
    );
};
export default injectIntl(JoinCall);
