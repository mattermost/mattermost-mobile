// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchEnabledDevices} from '@e2ee/actions/remote/devices';
import {Device} from '@e2ee/screens/enabled_devices/device';
import {useCallback, useEffect, useMemo} from 'react';
import {FlatList, View} from 'react-native';

import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getDeviceToken} from '@queries/app/global';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type E2EEEnabledDeviceModel from '@e2ee/types/database/models/e2ee_enabled_devices';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUser?: UserModel | null;
    devices: E2EEEnabledDeviceModel[];
};

const getStyleFromTheme = makeStyleSheetFromTheme((theme: Theme) => ({
    separator: {
        height: 1,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        width: '100%',
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

export const DeviceList = ({
    currentUser,
    devices,
}: Props) => {
    const theme = useTheme();
    const style = getStyleFromTheme(theme);
    const serverUrl = useServerUrl();

    useEffect(() => {
        if (!serverUrl) {
            return;
        }
        getDeviceToken().
            then((currentDeviceId) => fetchEnabledDevices(serverUrl, currentDeviceId)).
            catch((error) => {
                logError('failed to fetch e2ee enabled devices', getFullErrorMessage(error));
            });
    }, [serverUrl]);

    const timezone = getUserTimezone(currentUser ?? undefined);

    const listEmptyComponent = useMemo(() => (
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
    ), [style.emptyContainer, style.emptyParagraph, style.emptyTitle]);

    const renderItem = useCallback(({item}: {item: E2EEEnabledDeviceModel}) => (
        <Device
            device={item}
            isThisDevice={item.isCurrentDevice}
            timezone={timezone}
        />
    ), [timezone]);

    const renderSeparator = useCallback(() => (
        <View
            style={style.separator}
        />
    ), [style.separator]);

    return (
        <FlatList
            contentContainerStyle={devices.length ? undefined : style.emptyContent}
            data={devices}
            keyExtractor={(item) => item.deviceId}
            ListEmptyComponent={listEmptyComponent}
            renderItem={renderItem}
            testID='e2ee.device_list.flat_list'
            ItemSeparatorComponent={renderSeparator}
        />
    );
};
