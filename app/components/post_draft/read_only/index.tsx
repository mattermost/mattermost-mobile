// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessage} from 'react-intl';
import {View} from 'react-native';
import {type Edge, SafeAreaView} from 'react-native-safe-area-context';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {dmGmWriteDeniedMessage, writeDeniedMessage} from '@utils/channel_policy';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

interface ReadOnlyProps {
    testID?: string;
    writeDenied?: boolean;
    dmGmWriteDenied?: boolean;
}

const getStyle = makeStyleSheetFromTheme((theme: Theme) => ({
    wrapper: {
        backgroundColor: theme.centerChannelBg,
    },
    background: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
    },
    container: {
        alignItems: 'center',
        borderTopColor: changeOpacity(theme.centerChannelColor, 0.20),
        borderTopWidth: 1,
        flexDirection: 'row',
        height: 50,
        paddingHorizontal: 12,
    },
    icon: {
        fontSize: 20,
        lineHeight: 22,
        opacity: 0.56,
    },
    text: {
        color: theme.centerChannelColor,
        fontSize: 15,
        lineHeight: 20,
        marginLeft: 9,
        opacity: 0.56,
    },
}));

const edges: Edge[] = ['bottom'];

const readOnlyMessage = defineMessage({
    id: 'mobile.create_post.read_only',
    defaultMessage: 'This channel is read-only.',
});

const ReadOnlyChannnel = ({testID, writeDenied, dmGmWriteDenied}: ReadOnlyProps) => {
    const theme = useTheme();
    const style = getStyle(theme);

    let message = readOnlyMessage;
    if (dmGmWriteDenied) {
        message = dmGmWriteDeniedMessage;
    } else if (writeDenied) {
        message = writeDeniedMessage;
    }

    return (
        <View style={style.wrapper}>
            <SafeAreaView
                edges={edges}
                style={style.background}
            >
                <View
                    testID={testID}
                    style={style.container}
                >
                    <CompassIcon
                        name='glasses'
                        style={style.icon}
                        color={theme.centerChannelColor}
                    />
                    <FormattedText
                        {...message}
                        style={style.text}
                    />
                </View>
            </SafeAreaView>
        </View>
    );
};

export default ReadOnlyChannnel;
