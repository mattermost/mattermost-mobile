// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';
import Permissions from 'react-native-permissions';

import {makeCallsTheme} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import {Calls} from '@constants';
import {CALL_ERROR_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CallsTheme} from '@calls/types/calls';
import type {MessageBarType} from '@constants/calls';

type Props = {
    type: MessageBarType;
    onDismiss: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    outerContainer: {
        borderRadius: 8,
        height: CALL_ERROR_BAR_HEIGHT,
        marginLeft: 8,
        marginRight: 8,
        shadowColor: theme.centerChannelColor,
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 4,
    },
    outerContainerWarning: {
        backgroundColor: theme.awayIndicator,
    },
    innerContainer: {
        flexDirection: 'row',
        height: '100%',
        width: '100%',
        borderRadius: 8,
        paddingTop: 4,
        paddingRight: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        alignItems: 'center',
        backgroundColor: theme.dndIndicator,
    },
    innerContainerWarning: {
        backgroundColor: theme.awayIndicator,
    },
    iconContainer: {
        top: 1,
        width: 32,
    },
    icon: {
        fontSize: 18,
        color: theme.buttonColor,
        alignSelf: 'center',
    },
    warningIcon: {
        color: theme.callsBg,
    },
    textContainer: {
        flex: 1,
        marginLeft: 8,
    },
    errorText: {
        ...typography('Body', 100, 'SemiBold'),
        color: theme.buttonColor,
    },
    warningText: {
        color: theme.callsBg,
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
    closeIconWarning: {
        color: changeOpacity(theme.callsBg, 0.56),
    },
}));

const MessageBar = ({type, onDismiss}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = getStyleSheet(callsTheme);
    const warning = type === Calls.MessageBarType.CallQuality;

    let message = '';
    let icon = <></>;
    switch (type) {
        case Calls.MessageBarType.Microphone:
            message = intl.formatMessage({
                id: 'mobile.calls_mic_error',
                defaultMessage: 'To participate, open Settings to grant Mattermost access to your microphone.',
            });
            icon = (
                <CompassIcon
                    name='microphone-off'
                    style={[style.icon]}
                />);
            break;
        case Calls.MessageBarType.CallQuality:
            message = intl.formatMessage({
                id: 'mobile.calls_quality_warning',
                defaultMessage: 'Call quality may be degraded due to unstable network conditions.',
            });
            icon = (
                <CompassIcon
                    name='alert-outline'
                    style={[style.icon, style.warningIcon]}
                />);
            break;
    }

    return (
        <View style={[style.outerContainer, warning && style.outerContainerWarning]}>
            <Pressable
                onPress={Permissions.openSettings}
                style={[style.innerContainer, warning && style.innerContainerWarning]}
            >
                <View style={style.iconContainer}>
                    {icon}
                </View>
                <View style={style.textContainer}>
                    <Text style={[style.errorText, warning && style.warningText]}>{message}</Text>
                </View>
                <Pressable onPress={onDismiss}>
                    <View style={style.dismissContainer}>
                        <CompassIcon
                            name='close'
                            style={[style.icon, style.closeIcon, warning && style.closeIconWarning]}
                        />
                    </View>
                </Pressable>
            </Pressable>
        </View>
    );
};

export default MessageBar;
