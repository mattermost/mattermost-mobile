// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    websocketState: WebsocketConnectedState;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: 12,
        top: -4,
    },
    unreachable: {
        color: theme.dndIndicator,
        marginLeft: 5,
        ...typography('Body', 75, 'Regular'),
    },
}));

const WebSocket = ({websocketState}: Props) => {
    const theme = useTheme();

    if (websocketState === 'connected' || websocketState === 'connecting') {
        return null;
    }

    const style = getStyleSheet(theme);
    return (
        <View style={style.container}>
            <CompassIcon
                name='alert-outline'
                color={theme.dndIndicator}
                size={14.4}
            />
            <FormattedText
                id='server.websocket.unreachable'
                defaultMessage='Server is unreachable.'
                style={style.unreachable}
            />
        </View>
    );
};

export default WebSocket;
