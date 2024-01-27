// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {fetchProfilesInChannel} from '@actions/remote/user';
import {dismissIncomingCall} from '@calls/actions/calls';
import {removeIncomingCall} from '@calls/state';
import {ChannelType, type IncomingCallNotification} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ProfilePicture from '@components/profile_picture';
import {CALL_NOTIFICATION_BAR_HEIGHT} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import WebsocketManager from '@managers/websocket_manager';
import {getServerDisplayName} from '@queries/app/servers';
import ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type ServersModel from '@typings/database/models/app/servers';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    outerContainer: {
        borderRadius: 8,
        height: CALL_NOTIFICATION_BAR_HEIGHT,
        marginLeft: 8,
        marginRight: 8,
        backgroundColor: theme.onlineIndicator,
        shadowColor: theme.centerChannelColor,
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 4,
    },
    outerContainerServerName: {
        height: CALL_NOTIFICATION_BAR_HEIGHT + 8,
    },
    innerContainer: {
        flexDirection: 'row',
        width: '100%',
        height: '100%',
        borderRadius: 8,
        paddingTop: 4,
        paddingRight: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        alignItems: 'center',
        backgroundColor: changeOpacity('#000', 0.16),
    },
    innerOnCallsScreen: {
        paddingRight: 2,
        paddingLeft: 6,
        borderStyle: 'solid',
        borderWidth: 2,
        borderColor: changeOpacity(theme.buttonColor, 0.16),
        backgroundColor: changeOpacity('#000', 0.12),
    },
    profileContainer: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 18,
        color: theme.buttonColor,
        alignSelf: 'center',
    },
    textContainer: {
        flex: 1,
        flexDirection: 'column',
        marginLeft: 8,
    },
    text: {
        ...typography('Body', 100),
        color: theme.buttonColor,
    },
    boldText: {
        ...typography('Body', 100, 'SemiBold'),
        lineHeight: 20,
    },
    textServerName: {
        ...typography('Heading', 25),
        color: changeOpacity(theme.buttonColor, 0.72),
        textTransform: 'uppercase',
    },
    dismissContainer: {
        alignItems: 'center',
        width: 32,
        height: '100%',
        justifyContent: 'center',
    },
    closeIcon: {
        color: changeOpacity(theme.buttonColor, 0.56),
    },
}));

type Props = {
    servers: ServersModel[];
    incomingCall: IncomingCallNotification;
    currentUserId: string;
    teammateNameDisplay: string;
    members?: ChannelMembershipModel[];
    onCallsScreen?: boolean;
}

export const CallNotification = ({
    servers,
    incomingCall,
    currentUserId,
    teammateNameDisplay,
    members,
    onCallsScreen,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [serverName, setServerName] = useState('');
    const moreThanOneServer = servers.length > 1;

    useEffect(() => {
        const channelMembers = members?.filter((m) => m.userId !== currentUserId);
        if (!channelMembers?.length) {
            fetchProfilesInChannel(serverUrl, incomingCall.channelID, currentUserId, undefined, false);
        }
    }, []);

    // We only need to getServerDisplayName once
    useEffect(() => {
        async function getName() {
            setServerName(await getServerDisplayName(incomingCall.serverUrl));
        }

        if (moreThanOneServer) {
            getName();
        }
    }, [moreThanOneServer, incomingCall.serverUrl]);

    const onContainerPress = useCallback(async () => {
        if (incomingCall.serverUrl !== serverUrl) {
            await DatabaseManager.setActiveServerDatabase(incomingCall.serverUrl);
            await WebsocketManager.initializeClient(incomingCall.serverUrl);
        }
        switchToChannelById(incomingCall.serverUrl, incomingCall.channelID);
    }, [incomingCall, serverUrl]);

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
                numberOfLines={1}
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
                numberOfLines={1}
                ellipsizeMode={'tail'}
            />
        );
    }

    return (
        <View style={[style.outerContainer, moreThanOneServer && style.outerContainerServerName]}>
            <Pressable
                style={[style.innerContainer, onCallsScreen && style.innerOnCallsScreen]}
                onPress={onContainerPress}
            >
                <View style={style.profileContainer}>
                    <ProfilePicture
                        author={incomingCall.callerModel}
                        url={incomingCall.serverUrl}
                        size={24}
                        showStatus={false}
                    />
                </View>
                <View style={style.textContainer}>
                    {message}
                    {moreThanOneServer &&
                        <Text style={style.textServerName}>
                            {serverName}
                        </Text>
                    }
                </View>
                <Pressable onPress={onDismissPress}>
                    <View style={style.dismissContainer}>
                        <CompassIcon
                            name='close'
                            style={[style.icon, style.closeIcon]}
                        />
                    </View>
                </Pressable>
            </Pressable>
        </View>
    );
};
