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
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {CallsTheme} from '@calls/types/calls';
import type {MessageBarType} from '@constants/calls';

type Props = {
    type: MessageBarType;
    onPress: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => (
    {
        pressable: {
            zIndex: 10,
        },
        errorWrapper: {
            padding: 10,
            paddingTop: 0,
        },
        errorBar: {
            flexDirection: 'row',
            backgroundColor: theme.dndIndicator,
            minHeight: CALL_ERROR_BAR_HEIGHT,
            width: '100%',
            borderRadius: 5,
            padding: 10,
            alignItems: 'center',
        },
        warningBar: {
            backgroundColor: theme.awayIndicator,
        },
        errorText: {
            flex: 1,
            ...typography('Body', 100, 'SemiBold'),
            color: theme.buttonColor,
        },
        warningText: {
            color: theme.callsBg,
        },
        iconContainer: {
            width: 42,
            height: 42,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 4,
            margin: 0,
            padding: 9,
        },
        pressedIconContainer: {
            backgroundColor: theme.buttonColor,
        },
        errorIcon: {
            color: theme.buttonColor,
            fontSize: 18,
        },
        warningIcon: {
            color: theme.callsBg,
        },
        pressedErrorIcon: {
            color: theme.dndIndicator,
        },
        pressedWarningIcon: {
            color: theme.awayIndicator,
        },
        paddingRight: {
            paddingRight: 9,
        },
    }
));

const MessageBar = ({type, onPress}: Props) => {
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
                    style={[style.errorIcon, style.paddingRight]}
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
                    style={[style.errorIcon, style.warningIcon, style.paddingRight]}
                />);
            break;
    }

    return (
        <View style={style.errorWrapper}>
            <Pressable
                onPress={Permissions.openSettings}
                style={[style.errorBar, warning && style.warningBar]}
            >
                {icon}
                <Text style={[style.errorText, warning && style.warningText]}>{message}</Text>
                <Pressable
                    onPress={onPress}
                    hitSlop={5}
                    style={({pressed}) => [
                        style.pressable,
                        style.iconContainer,
                        pressed && style.pressedIconContainer,
                    ]}
                >
                    {({pressed}) => (
                        <CompassIcon
                            name='close'
                            style={[style.errorIcon,
                                warning && style.warningIcon,
                                pressed && style.pressedErrorIcon,
                                pressed && warning && style.pressedWarningIcon,
                            ]}
                        />
                    )}
                </Pressable>
            </Pressable>
        </View>
    );
};

export default MessageBar;
