// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import Markdown from '@components/markdown';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        helpTextContainer: {
            marginHorizontal: 15,
            marginTop: 10,
        },
        helpText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
        errorTextContainer: {
            marginHorizontal: 15,
            marginVertical: 10,
        },
        errorText: {
            fontSize: 12,
            color: theme.errorTextColor,
        },
    };
});

type Props = {
    disabled: boolean;
    disabledText?: string;
    helpText?: string;
    errorText?: string;
    location: AvailableScreens;
}
function Footer({
    disabled,
    disabledText,
    helpText,
    errorText,
    location,
}: Props) {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    return (
        <>
            {disabled && Boolean(disabledText) && (
                <View style={style.helpTextContainer} >
                    <Markdown
                        baseTextStyle={style.helpText}
                        disableAtMentions={true}
                        location={location}
                        value={disabledText}
                        theme={theme}
                    />
                </View>
            )}
            {Boolean(helpText) && (
                <View style={style.helpTextContainer} >
                    <Markdown
                        baseTextStyle={style.helpText}
                        disableAtMentions={true}
                        location={location}
                        value={helpText}
                        theme={theme}
                    />
                </View>
            )}
            {Boolean(errorText) && (
                <View style={style.errorTextContainer} >
                    <Markdown
                        baseTextStyle={style.errorText}
                        disableAtMentions={true}
                        location={location}
                        value={errorText}
                        theme={theme}
                    />
                </View>
            )}
        </>
    );
}

export default Footer;
