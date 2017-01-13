// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes} from 'react';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

function ChannelDropdown(props) {
    const items = [{
        title: 'View Info',
        action: () => true
    }, {
        title: 'Notification Preferences',
        action: () => true
    }, {
        title: 'Add Members',
        action: () => true
    }, {
        title: 'View Members',
        action: () => true
    }, {
        title: 'Edit Channel Header',
        action: () => true
    }, {
        title: 'Edit Channel Purpose',
        action: () => true
    }, {
        title: 'Rename Channel',
        action: () => true
    }, {
        title: 'Leave Channel',
        action: () => true
    }, {
        title: 'Add to Favorites',
        action: () => true
    }];

    return (
        <View style={{flex: 1}}>
            <ScrollView>
                <View style={{flex: 1, alignItems: 'center'}}>
                    {items.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={{alignSelf: 'stretch', height: 50, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#fff', marginHorizontal: 20}}
                            onPress={item.action}
                        >
                            <Text style={{color: '#fff', textAlign: 'center', fontSize: 18}}>{item.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={{paddingVertical: 30, alignItems: 'center', justifyContent: 'center'}}>
                    <TouchableOpacity
                        style={{height: 50, width: 50, borderRadius: 25, borderColor: '#fff', borderWidth: 2, alignItems: 'center', justifyContent: 'center'}}
                        onPress={props.close}
                    >
                        <Icon
                            name='close'
                            size={24}
                            color='#fff'
                        />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

ChannelDropdown.propTypes = {
    close: PropTypes.func.isRequired
};

export default ChannelDropdown;
