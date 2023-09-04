// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {fetchProfilesInChannel} from '@actions/remote/user';
import {dismissIncomingCall} from '@calls/actions/calls';
import {leaveAndJoinWithAlert} from '@calls/alerts';
import {removeIncomingCall} from '@calls/state';
import {ChannelType, type IncomingCallNotification} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {Preferences} from '@constants';
import {CALL_NOTIFICATION_BAR_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

const style = StyleSheet.create({
    outerContainer: {
        backgroundColor: Preferences.THEMES.denim.onlineIndicator,
        borderRadius: 8,
        height: CALL_NOTIFICATION_BAR_HEIGHT,
        marginLeft: 8,
        marginRight: 8,
    },
    outerOnCallsScreen: {
        backgroundColor: changeOpacity(Preferences.THEMES.denim.onlineIndicator, 0.40),
    },
    innerContainer: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderStyle: 'solid',
        borderColor: changeOpacity(Preferences.THEMES.denim.buttonColor, 0.16),
        gap: 8,
        alignItems: 'center',
        backgroundColor: changeOpacity('#000', 0.16),
    },
    innerOnCallsScreen: {
        borderColor: changeOpacity(Preferences.THEMES.denim.buttonColor, 0.16),
        backgroundColor: changeOpacity('#000', 0.12),
    },
    text: {
        flex: 1,
        ...typography('Body', 200),
        lineHeight: 20,
        color: Preferences.THEMES.denim.buttonColor,
    },
    boldText: {
        ...typography('Body', 200, 'SemiBold'),
        lineHeight: 20,
    },
    join: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 40,
        gap: 7,
        backgroundColor: Preferences.THEMES.denim.buttonColor,
        paddingTop: 10,
        paddingRight: 20,
        paddingBottom: 10,
        paddingLeft: 20,
        borderRadius: 30,
    },
    joinOnCallsScreen: {
        backgroundColor: changeOpacity(Preferences.THEMES.denim.buttonColor, 0.12),
    },
    joinLabel: {
        ...typography('Body', 100, 'SemiBold'),
    },
    joinIconLabel: {
        color: Preferences.THEMES.denim.onlineIndicator,
    },
    joinIconLabelOnCallsScreen: {
        color: Preferences.THEMES.denim.buttonColor,
    },
    dismiss: {
        height: 40,
        width: 40,
        borderRadius: 20,
        padding: 0,
        backgroundColor: changeOpacity(Preferences.THEMES.denim.buttonColor, 0.08),
        alignItems: 'center',
        justifyContent: 'center',
    },
    dismissOnCallsScreen: {
        backgroundColor: 'transparent',
    },
    dismissIcon: {
        color: Preferences.THEMES.denim.buttonColor,
    },
});

type Props = {
    incomingCall: IncomingCallNotification;
    currentUserId: string;
    teammateNameDisplay: string;
    members?: ChannelMembershipModel[];
    onCallsScreen?: boolean;
}

export const CallNotification = ({
    incomingCall,
    currentUserId,
    teammateNameDisplay,
    members,
    onCallsScreen,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    useEffect(() => {
        const channelMembers = members?.filter((m) => m.userId !== currentUserId);
        if (!channelMembers?.length) {
            fetchProfilesInChannel(serverUrl, incomingCall.channelID, currentUserId, undefined, false);
        }
    }, []);

    const onJoinPress = useCallback(() => {
        leaveAndJoinWithAlert(intl, incomingCall.serverUrl, incomingCall.channelID);
    }, [intl, incomingCall]);

    const onContainerPress = useCallback(async () => {
        if (serverUrl !== incomingCall.serverUrl) {
            await DatabaseManager.setActiveServerDatabase(incomingCall.serverUrl);
            await WebsocketManager.initializeClient(incomingCall.serverUrl);
        }
        switchToChannelById(incomingCall.serverUrl, incomingCall.channelID);
    }, [serverUrl, incomingCall]);

    const onDismissPress = useCallback(() => {
        removeIncomingCall(serverUrl, incomingCall.callID, incomingCall.channelID);
        dismissIncomingCall(incomingCall.serverUrl, incomingCall.channelID);
    }, [incomingCall]);

    let message: React.ReactElement;
    if (incomingCall.type === ChannelType.DM) {
        message = (
            <FormattedText
                id={'mobile.calls_incoming_dm'}
                defaultMessage={'<b>{name}</b> is inviting you to a call'}
                values={{
                    b: (text: string) => <Text style={style.boldText}>{text}</Text>,
                    name: displayUsername(incomingCall.callerModel, intl.locale, teammateNameDisplay),
                }}
                style={style.text}
                numberOfLines={2}
                ellipsizeMode={'tail'}
            />
        );
    } else {
        message = (
            <FormattedText
                id={'mobile.calls_incoming_gm'}
                defaultMessage={'<b>{name}</b> is inviting you to a call with  <b>{num, plural, one {# other} other {# others}}</b>'}
                values={{
                    b: (text: string) => <Text style={style.boldText}>{text}</Text>,
                    name: displayUsername(incomingCall.callerModel, intl.locale, teammateNameDisplay),
                    num: (members?.length || 2) - 1,
                }}
                style={style.text}
                numberOfLines={2}
                ellipsizeMode={'tail'}
            />
        );
    }
    const joinLabel = (
        <FormattedText
            id={'mobile.calls_join_button'}
            defaultMessage={'Join'}
            style={[style.joinIconLabel, style.joinLabel, onCallsScreen && style.joinIconLabelOnCallsScreen]}
        />
    );

    return (
        <View style={[style.outerContainer, onCallsScreen && style.outerOnCallsScreen]}>
            <Pressable
                style={[style.innerContainer, onCallsScreen && style.innerOnCallsScreen]}
                onPress={onContainerPress}
            >
                <ProfilePicture
                    author={incomingCall.callerModel}
                    url={incomingCall.serverUrl}
                    size={32}
                    showStatus={false}
                />
                {message}
                <Pressable
                    style={[style.join, onCallsScreen && style.joinOnCallsScreen]}
                    onPress={onJoinPress}
                >
                    <CompassIcon
                        name='phone-in-talk'
                        size={18}
                        style={[style.joinIconLabel, onCallsScreen && style.joinIconLabelOnCallsScreen]}
                    />
                    {joinLabel}
                </Pressable>
                <Pressable
                    style={[style.dismiss, onCallsScreen && style.dismissOnCallsScreen]}
                    onPress={onDismissPress}
                >
                    <CompassIcon
                        name={'close'}
                        size={24}
                        style={style.dismissIcon}
                    />
                </Pressable>
            </Pressable>
        </View>
    );
};
