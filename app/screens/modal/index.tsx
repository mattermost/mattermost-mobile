// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import {Navigation} from 'react-native-navigation';

export default class Modal extends React.Component {
    // Set a dismiss button in static options
    static options() {
        return {
            topBar: {
                leftButtons: [{
                    id: 'dismiss',
                    icon: require('@assets/images/autocomplete/slash_command.png'),
                }],
            },
        };
    }

    constructor(props) {
        super(props);

        // Register to events
        Navigation.events().bindComponent(this);
    }

    // Handle the button press event and dismiss the modal if needed
    navigationButtonPressed({buttonId}) {
        if (buttonId === 'dismiss') {
            console.log('>>>>>>>>>>>>>>> pressed');
            Navigation.dismissModal(this.props.componentId);
        }
    }

    render() {
        return (
            <View style={{backgroundColor: '#ffffff', flex: 1}}>
                <Text>{'Modal screen'}</Text>
            </View>
        );
    }
}
