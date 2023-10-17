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

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => (
    {
        outerContainer: {
            borderRadius: 8,
            backgroundColor: theme.dndIndicator,
            height: CALL_ERROR_BAR_HEIGHT,
            marginLeft: 8,
            marginRight: 8,
        },
        outerContainerWarning: {
            backgroundColor: theme.awayIndicator,
        },
        innerContainer: {
            flexDirection: 'row',
            backgroundColor: theme.dndIndicator,
            height: '100%',
            width: '100%',
            borderRadius: 8,
            borderWidth: 2,
            borderColor: changeOpacity(theme.buttonColor, 0.16),
            paddingTop: 4,
            paddingLeft: 15,
            paddingBottom: 4,
            justifyContent: 'center',
            alignItems: 'center',
        },
        innerContainerWarning: {
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
        closeIcon: {
            color: changeOpacity(theme.buttonColor, 0.56),
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 4,
            paddingBottom: 4,
        },
        errorIcon: {
            paddingRight: 9,
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
    }
));

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
                    style={[style.errorIcon]}
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
                    style={[style.errorIcon, style.warningIcon]}
                />);
            break;
    }

    return (
        <View style={[style.outerContainer, warning && style.outerContainerWarning]}>
            <Pressable
                onPress={Permissions.openSettings}
                style={[style.innerContainer, warning && style.innerContainerWarning]}
            >
                {icon}
                <Text style={[style.errorText, warning && style.warningText]}>{message}</Text>
                <Pressable onPress={onDismiss}>
                    <CompassIcon
                        name='close'
                        size={18}
                        style={style.closeIcon}
                    />
                </Pressable>
            </Pressable>
        </View>
    );
};

export default MessageBar;
