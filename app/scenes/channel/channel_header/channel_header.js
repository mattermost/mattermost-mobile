// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    Text,
    TouchableHighlight,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default class ChannelHeader extends React.PureComponent {
    static propTypes = {
        displayName: React.PropTypes.string.isRequired,
        theme: React.PropTypes.object.isRequired,
        openLeftDrawer: React.PropTypes.func.isRequired,
        openRightDrawer: React.PropTypes.func.isRequired
    }

    render() {
        const {
            displayName,
            theme
        } = this.props;

        return (
            <View style={{backgroundColor: theme.sidebarHeaderBg, flexDirection: 'row', justifyContent: 'flex-start', marginTop: 20}}>
                <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                    <TouchableHighlight
                        onPress={this.props.openLeftDrawer}
                        style={{height: 25, width: 25, marginLeft: 10, marginRight: 10}}
                    >
                        <Icon
                            name='bars'
                            size={25}
                            color={theme.sidebarHeaderTextColor}
                        />
                    </TouchableHighlight>
                </View>
                <View style={{flex: 1, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', backgroundColor: theme.sidebarHeaderBg}}>
                    <Text style={{color: theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold'}}>
                        {displayName}
                    </Text>
                </View>
                <TouchableHighlight
                    onPress={this.props.openRightDrawer}
                    style={{height: 50, width: 50}}
                >
                    <Text style={{color: theme.sidebarHeaderTextColor}}>{'>'}</Text>
                </TouchableHighlight>
            </View>
        );
    }
}
