// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import Button from 'app/components/button';
import {GlobalStyles} from 'app/styles';
import {Text, View} from 'react-native';

export default class Search extends React.Component {
    static propTypes = {
        actions: React.PropTypes.object.isRequired,
        searchType: React.PropTypes.string.isRequired
    };

    render() {
        return (
            <View style={GlobalStyles.container}>
                <Text>
                    {'This is a search for ' + this.props.searchType}
                </Text>
                <Button onPress={this.props.actions.goBack}>
                    <Text>
                        {'<< Go back'}
                    </Text>
                </Button>
            </View>
        );
    }
}
