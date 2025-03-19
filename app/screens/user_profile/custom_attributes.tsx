// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, StyleSheet, type ListRenderItem} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import UserProfileLabel from './label';

import type {CustomAttribute} from '@typings/api/custom_profile_attributes';

type Props = {
    nickname?: string;
    position?: string;
    localTime?: string;
    customAttributes?: CustomAttribute[];
}

const renderAttribute: ListRenderItem<CustomAttribute> = ({item}) => (
    <UserProfileLabel
        title={item.name}
        description={item.value}
        testID={`custom_attribute.${item.id}`}
    />
);

const CustomAttributes = ({nickname, position, localTime, customAttributes}: Props) => {
    const {formatMessage} = useIntl();

    // Combine standard and custom attributes
    const mergeAttributes = [
        (nickname ? {
            id: 'nickname',
            name: formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'}),
            value: nickname,
        } : {}),
        (position ? {
            id: 'position',
            name: formatMessage({id: 'channel_info.position', defaultMessage: 'Position'}),
            value: position,
        } : {}),
        (localTime ? {
            id: 'local_time',
            name: formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'}),
            value: localTime,
        } : {}),

        ...(customAttributes ?? []),
    ];

    // remove any empty objects
    const attributes = mergeAttributes.filter((v) => Object.entries(v).length !== 0);

    return (
        <View style={styles.container}>
            <FlatList
                data={attributes}
                renderItem={renderAttribute}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                removeClippedSubviews={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        flex: 1,
    },
});

export default CustomAttributes;
