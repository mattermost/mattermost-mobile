// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {
    Text,
    TouchableHighlight,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

export default class ChannelHeader extends React.PureComponent {
    static propTypes = {
        displayName: React.PropTypes.string.isRequired,
        theme: React.PropTypes.object.isRequired,
        openLeftDrawer: React.PropTypes.func.isRequired,
        openRightDrawer: React.PropTypes.func.isRequired,
        toggleChannelDropdown: React.PropTypes.func.isRequired
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
                    <TouchableOpacity
                        style={{flexDirection: 'row', alignItems: 'center'}}
                        onPress={this.props.toggleChannelDropdown}
                    >
                        <Text style={{color: theme.sidebarHeaderTextColor, fontSize: 15, fontWeight: 'bold'}}>
                            {displayName}
                        </Text>
                        <Icon
                            name='chevron-down'
                            size={16}
                            color={theme.sidebarHeaderTextColor}
                            style={{marginLeft: 10}}
                        />
                    </TouchableOpacity>
                </View>
                <View style={{flexDirection: 'row'}}>
                    <TouchableOpacity
                        style={{height: 50, width: 50, alignItems: 'center', justifyContent: 'center'}}
                        onPress={this.props.openRightDrawer}
                    >
                        <Icon
                            name='ellipsis-v'
                            size={16}
                            color={theme.sidebarHeaderTextColor}
                        />
                    </TouchableOpacity>
                </View>
            </View>
        );
    }
}
