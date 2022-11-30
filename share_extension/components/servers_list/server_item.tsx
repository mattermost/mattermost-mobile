// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from '@react-navigation/native';
import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {setShareExtensionServerUrl} from '@share/state';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {removeProtocol, stripTrailingSlashes} from '@utils/url';

import type ServersModel from '@typings/database/models/app/servers';

type Props = {
    server: ServersModel;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        borderRadius: 8,
        flexDirection: 'row',
        height: 72,
        marginBottom: 12,
    },
    details: {
        marginLeft: 14,
        flex: 1,
    },
    name: {
        color: theme.centerChannelColor,
        flexShrink: 1,
        ...typography('Body', 200, 'SemiBold'),
    },
    nameView: {
        flexDirection: 'row',
        marginRight: 7,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 18,
    },
    url: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        marginRight: 7,
        ...typography('Body', 75, 'Regular'),
    },
}));

const ServerItem = ({server, theme}: Props) => {
    const navigation = useNavigation();
    const styles = getStyleSheet(theme);

    const onServerPressed = useCallback(() => {
        setShareExtensionServerUrl(server.url);
        navigation.goBack();
    }, [server]);

    return (
        <TouchableOpacity
            onPress={onServerPressed}
            style={styles.container}
        >
            <View style={styles.row}>
                <CompassIcon
                    size={36}
                    name='server-variant'
                    color={changeOpacity(theme.centerChannelColor, 0.56)}
                />
                <View style={styles.details}>
                    <View style={styles.nameView}>
                        <Text
                            numberOfLines={1}
                            ellipsizeMode='tail'
                            style={styles.name}
                        >
                            {server.displayName}
                        </Text>
                    </View>
                    <Text
                        numberOfLines={1}
                        ellipsizeMode='tail'
                        style={styles.url}
                    >
                        {removeProtocol(stripTrailingSlashes(server.url))}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default ServerItem;
