// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Pressable, View} from 'react-native';
import Permissions from 'react-native-permissions';

import {setMicPermissionsErrorDismissed} from '@calls/state';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {CALL_ERROR_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => (
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
        errorText: {
            flex: 1,
            ...typography('Body', 100, 'SemiBold'),
            color: theme.buttonColor,
        },
        errorIconContainer: {
            width: 42,
            height: 42,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 4,
            margin: 0,
            padding: 9,
        },
        pressedErrorIconContainer: {
            backgroundColor: theme.buttonColor,
        },
        errorIcon: {
            color: theme.buttonColor,
            fontSize: 18,
        },
        pressedErrorIcon: {
            color: theme.dndIndicator,
        },
        paddingRight: {
            paddingRight: 9,
        },
    }
));

const PermissionErrorBar = () => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <View style={style.errorWrapper}>
            <Pressable
                onPress={Permissions.openSettings}
                style={style.errorBar}
            >
                <CompassIcon
                    name='microphone-off'
                    style={[style.errorIcon, style.paddingRight]}
                />
                <FormattedText
                    id={'mobile.calls_mic_error'}
                    defaultMessage={'To participate, open Settings to grant Mattermost access to your microphone.'}
                    style={style.errorText}
                />
                <Pressable
                    onPress={setMicPermissionsErrorDismissed}
                    hitSlop={5}
                    style={({pressed}) => [
                        style.pressable,
                        style.errorIconContainer,
                        pressed && style.pressedErrorIconContainer,
                    ]}
                >
                    {({pressed}) => (
                        <CompassIcon
                            name='close'
                            style={[style.errorIcon, pressed && style.pressedErrorIcon]}
                        />
                    )}
                </Pressable>
            </Pressable>
        </View>
    );
};

export default PermissionErrorBar;
