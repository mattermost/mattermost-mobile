// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import {Text, View} from 'react-native';

export default class ChannelDropdown extends React.Component {
    static propTypes = {
        visible: React.PropTypes.bool.isRequired
    }
    
    constructor(props) {
        super(props);

        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
    }
    
    render() {
        return (
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
                <Text>{'This is some text.'}</Text>
            </View>
        );
    }
}
