// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {FlatList, type ListRenderItemInfo, StyleSheet, View} from 'react-native';

import {sortServersByDisplayName} from '@utils/server';

import ServerItem from './server_item';

import type ServersModel from '@typings/database/models/app/servers';

type Props = {
    servers: ServersModel[];
    theme: Theme;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 16,
        marginHorizontal: 20,
    },
    contentContainer: {
        marginVertical: 4,
    },
});

const keyExtractor = (item: ServersModel) => item.url;

const ServersList = ({servers, theme}: Props) => {
    const intl = useIntl();
    const data = useMemo(() => sortServersByDisplayName(servers, intl), [intl.locale, servers]);

    const renderServer = useCallback(({item}: ListRenderItemInfo<ServersModel>) => {
        return (
            <ServerItem
                server={item}
                theme={theme}
            />
        );
    }, [theme]);

    return (
        <View style={styles.container}>
            <FlatList
                data={data}
                renderItem={renderServer}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.contentContainer}
            />
        </View>
    );
};

export default ServersList;
