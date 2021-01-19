// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MM_TABLES} from '@constants/database';
import Servers from '@typings/database/servers';
import React from 'react';
import {FlatList, Text, View} from 'react-native';
import withObservables from '@nozbe/with-observables';

import DBManager from '../../../database/admin/database_manager';

const ListOfServers = ({servers} : { servers : Servers[]}) => {
    console.log('>>>  ***  ', servers);
    return (
        <View>
            {servers.length > 0 && (
                <FlatList
                    data={servers}
                    renderItem={({item, index}) => {
                        const {displayName, id, mentionCount} = item as Servers;
                        return (
                            <View
                                key={index}
                                style={{flexDirection: 'row'}}
                            >
                                <Text>{id}</Text>
                                <Text>{displayName}</Text>
                                <Text>{mentionCount}</Text>
                            </View>
                        );
                    }}
                />)}
        </View>
    );
};

const enhance = withObservables([], () => {
    const getServerCollection = async () => {
        const defaultDB = await DBManager.getDefaultDatabase();
        const serverCollections = defaultDB.collections.get('servers').query().fetch();
        return serverCollections || [];
    };

    return {
        servers: getServerCollection(),
    };
});

const EnhancedListOfServers = enhance(ListOfServers);

export default EnhancedListOfServers;
