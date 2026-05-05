// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useBottomSheetScrollableCreator} from '@gorhom/bottom-sheet';
import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {StyleSheet, View, type ListRenderItemInfo, FlatList} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {TutorialProvider} from '@context/tutorial';
import {BUTTON_HEIGHT} from '@screens/bottom_sheet';
import BottomSheetContent from '@screens/bottom_sheet/content';
import {addNewServer} from '@utils/server';

import ServerItem from './server_item';

import type ServersModel from '@typings/database/models/app/servers';

export {default as AddServerButton} from './add_server_button';

type Props = {
    servers: ServersModel[];
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
    },
    contentContainer: {
        marginVertical: 4,
    },
});

const keyExtractor = (item: ServersModel) => item.url;

const ServerList = ({servers}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const {bottom} = useSafeAreaInsets();

    const onAddServer = useCallback(async () => {
        addNewServer(theme);
    }, [theme]);

    const renderServer = useCallback(({item: t, index}: ListRenderItemInfo<ServersModel>) => {
        return (
            <ServerItem
                highlight={index === 0}
                isActive={t.url === serverUrl}
                server={t}
            />
        );
    }, [serverUrl]);

    const BottomSheetScrollableCreator = useBottomSheetScrollableCreator();

    const serverListStyle = useMemo(() => ({paddingBottom: 2 * (BUTTON_HEIGHT + bottom)}), [bottom]);

    return (
        <BottomSheetContent
            buttonIcon='plus'
            buttonText={intl.formatMessage({id: 'servers.create_button', defaultMessage: 'Add a server'})}
            onPress={onAddServer}
            showButton={false}
            showTitle={true}
            testID='server_list'
            title={intl.formatMessage({id: 'your.servers', defaultMessage: 'Your servers'})}
        >
            <TutorialProvider>
                <View style={styles.container}>
                    <FlatList
                        data={servers}
                        renderItem={renderServer}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={[styles.contentContainer, serverListStyle]}
                        renderScrollComponent={BottomSheetScrollableCreator}
                    />
                </View>
            </TutorialProvider>
        </BottomSheetContent>
    );
};

export default ServerList;
