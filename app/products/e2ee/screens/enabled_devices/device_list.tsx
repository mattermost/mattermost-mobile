// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRegisteredDevices} from '@e2ee/actions/remote/devices';
import {Device} from '@e2ee/screens/enabled_devices/device';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {FlatList, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser?: UserModel;
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => ({
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        width: '100%',
    },
    loadingStyle: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContent: {
        flexGrow: 1,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        color: theme.centerChannelColor,
        textAlign: 'center',
        ...typography('Heading', 400, 'SemiBold'),
    },
    emptyParagraph: {
        marginTop: 8,
        textAlign: 'center',
        color: changeOpacity(theme.centerChannelColor, 0.75),
        ...typography('Body', 200),
    },
}));

export const DeviceList = ({currentUser}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const serverUrl = useServerUrl();
    const [devices, setDevices] = useState<DisplayDevice[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const timezone = getUserTimezone(currentUser);

    useEffect(() => {
        if (!serverUrl) {
            return;
        }

        setIsLoading(true);
        fetchRegisteredDevices(serverUrl).then((response) => {
            if (response.devices) {
                setDevices(response.devices);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, [serverUrl]);

    const listEmptyComponent = useMemo(() => {
        return (
            <View style={style.emptyContainer}>
                <FormattedText
                    id='e2ee.device_list.empty.title'
                    defaultMessage='No devices yet'
                    style={style.emptyTitle}
                    testID='e2ee.device_list.empty.title'
                />
                <FormattedText
                    id='e2ee.device_list.empty.paragraph'
                    defaultMessage='Devices with end-to-end encryption enabled will appear here.'
                    style={style.emptyParagraph}
                    testID='e2ee.device_list.empty.paragraph'
                />
            </View>
        );
    }, [style.emptyContainer, style.emptyParagraph, style.emptyTitle]);

    const renderItem = useCallback(({item}: {item: DisplayDevice}) => (
        <Device
            device={item}
            timezone={timezone}
        />
    ), [timezone]);

    const renderSeparator = useCallback(() => (
        <View
            style={style.separator}
        />
    ), [style.separator]);

    if (isLoading) {
        return (
            <Loading
                containerStyle={style.loadingStyle}
                testID='e2ee.device_list.loading'
            />
        );
    }

    return (
        <FlatList
            contentContainerStyle={devices.length ? undefined : style.emptyContent}
            data={devices}
            keyExtractor={(item) => item.device_id}
            ListEmptyComponent={listEmptyComponent}
            renderItem={renderItem}
            testID='e2ee.device_list.flat_list'
            ItemSeparatorComponent={renderSeparator}
        />
    );
};
