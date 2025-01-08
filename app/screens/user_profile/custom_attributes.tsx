// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {FlatList, View, StyleSheet, type ListRenderItem} from 'react-native';

import UserProfileLabel from './label';

export type CustomAttribute = {
    id: string;
    label: string;
    value: string;
};

type Props = {
    nickname?: string;
    position?: string;
    localTime?: string;
    enableCustomAttributes?: boolean;
}

const CustomAttributes = ({nickname, position, localTime, enableCustomAttributes}: Props) => {
    const {formatMessage} = useIntl();

    // Combine standard and custom attributes
    const attributes = [
        ...(nickname ? [{
            id: 'nickname',
            label: formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'}),
            value: nickname,
        }] : []),
        ...(position ? [{
            id: 'position',
            label: formatMessage({id: 'channel_info.position', defaultMessage: 'Position'}),
            value: position,
        }] : []),
        ...(localTime ? [{
            id: 'local_time',
            label: formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'}),
            value: localTime,
        }] : []),

        // Only show custom attributes if the feature flag is enabled
        ...(enableCustomAttributes ? customAttributes : []),
    ];
    const renderAttribute: ListRenderItem<CustomAttribute> = ({item}) => (
        <UserProfileLabel
            title={item.label}
            description={item.value}
            testID={`custom_attribute.${item.id}`}
        />
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={attributes}
                renderItem={renderAttribute}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={true}
                scrollEnabled={true}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                initialNumToRender={10}
                windowSize={5}
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
