import React, {Component} from 'react';
import {View, Text} from 'react-native';

export default class PageTwo extends Component {
    render() {
        return (
            <View style={{margin: 128}}>
                <Text>This is PageTwo!</Text>
                <Text>{this.props.text}</Text>
            </View>
        );
    }
}
