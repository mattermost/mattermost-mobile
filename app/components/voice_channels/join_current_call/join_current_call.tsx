// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, Platform, Pressable} from 'react-native';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

import Avatars from '@components/avatars';
import FormattedText from '@components/formatted_text';
import {GenericAction} from '@mm-redux/types/actions';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';
import type {Call} from '@mm-redux/types/voiceCalls';

type Props = {
    actions: {
        joinCall: (channelId: string) => GenericAction;
    };
    theme: Theme;
    call: Call;
}

const getStyleSheet = makeStyleSheetFromTheme((props: Props) => {
    return {
        wrapper: {
            position: 'absolute',
            top: 55,
            width: '100%',
            height: '100%',
            padding: 0,
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
            padding: 0,
            height: 40,
            alignItems: 'center',
        },
        joinCallIcon: {
            color: props.theme.sidebarText,
            marginLeft: 10,
            marginRight: 5,
        },
        joinCall: {
            color: props.theme.sidebarText,
            fontWeight: 'bold',
            fontSize: 16,
        },
        started: {
            flex: 1,
            color: props.theme.sidebarText,
            fontWeight: '400',
            marginLeft: 10,
        },
        avatars: {
            marginRight: 5,
        },
        headerText: {
            color: changeOpacity(props.theme.centerChannelColor, 0.56),
            fontSize: 12,
            fontWeight: '600',
            paddingHorizontal: 16,
            paddingVertical: 0,
            top: 16,
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
                    size={16}
                    style={style.joinCallIcon}
                />
                <Text style={style.joinCall}>{'Join Call'}</Text>
                <Text style={style.started}>{'Started X minutes ago'}</Text>
                <View style={style.avatars}>
                    <Avatars
                        userIds={Object.values(props.call.participants).map((x) => x.id)}
                        breakAt={1}
                        listTitle={
                            <FormattedText
                                id='voice_calls.join_call.participants_list_header'
                                defaultMessage={'CALL PARTICIPANTS'}
                                style={style.headerText}
                            />
                        }
                    />
                </View>
            </View>
        </Pressable>
    );
};
export default JoinCurrentCall;
