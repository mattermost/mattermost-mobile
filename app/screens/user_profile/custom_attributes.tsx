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
        type={item.type}
    />
);

const CustomAttributes = ({nickname, position, localTime, customAttributes}: Props) => {
    const {formatMessage} = useIntl();

    // Combine standard and custom attributes
    const mergeAttributes: CustomAttribute[] = [];
    if (nickname) {
        mergeAttributes.push({
            id: 'nickname',
            name: formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'}),
            type: 'text',
            value: nickname,
        });
    }
    if (position) {
        mergeAttributes.push({
            id: 'position',
            name: formatMessage({id: 'channel_info.position', defaultMessage: 'Position'}),
            type: 'text',
            value: position,
        });
    }
    if (localTime) {
        mergeAttributes.push({
            id: 'local_time',
            name: formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'}),
            type: 'text',
            value: localTime,
        });
    }
    mergeAttributes.push(...(customAttributes ?? []));

    // remove any empty objects
    const attributes: CustomAttribute[] = mergeAttributes.filter((v: CustomAttribute) => Object.entries(v).length !== 0);
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
