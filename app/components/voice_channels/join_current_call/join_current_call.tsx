// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, Platform, Pressable} from 'react-native';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

import {GenericAction} from '@mm-redux/types/actions';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Channel} from '@mm-redux/types/channels';
import type {Theme} from '@mm-redux/types/theme';
import type {Call} from '@mm-redux/types/voiceCalls';

type Props = {
    actions: {
        joinCall: (channelId: string) => GenericAction;
    };
    theme: Theme;
    channel: Channel;
    call: Call;
}

const getStyleSheet = makeStyleSheetFromTheme((props: Props) => {
    return {
        wrapper: {
            position: 'absolute',
            top: 60,
            width: '100%',
            height: '100%',
            padding: 10,
        },
        container: {
            ...Platform.select({
                android: {
                    elevation: 3,
                },
                ios: {
                    zIndex: 3,
                },
            }),
            flexDirection: 'row',
            backgroundColor: '#3DB887',
            width: '100%',
            borderRadius: 5,
            padding: 4,
            height: 64,
            alignItems: 'center',
        },
        joinCallIcon: {
            color: props.theme.sidebarText,
            margin: 10,
        },
        joinCall: {
            color: props.theme.sidebarText,
            fontWeight: 'bold',
            fontSize: 16,
        },
        started: {
            color: props.theme.sidebarText,
            fontWeight: '400',
            marginLeft: 10,
        },
    };
});

const JoinCurrentCall = (props: Props) => {
    if (!props.call) {
        return null;
    }
    const style = getStyleSheet(props);
    return (
        <Pressable
            style={style.wrapper}
            onPress={() => props.actions.joinCall(props.call.channelId)}
        >
            <View style={style.container}>
                <FontAwesome5Icon
                    name='phone'
                    size={24}
                    style={style.joinCallIcon}
                />
                <Text style={style.joinCall}>{'Join Call'}</Text>
                <Text style={style.started}>{'Started X minutes ago'}</Text>
            </View>
        </Pressable>
    );
};
export default JoinCurrentCall;
