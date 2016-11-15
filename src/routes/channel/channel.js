// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import PureRenderMixin from 'react-addons-pure-render-mixin';

import Drawer from 'react-native-drawer';
import ChannelSidebar from 'components/channel_sidebar.js';
import Loading from 'components/loading.js';
import RightSidebarMenu from 'components/right_sidebar_menu.js';
import {StatusBar, Text, TouchableHighlight, View} from 'react-native';

export default class Channel extends React.Component {
    static propTypes = {
        actions: React.PropTypes.object.isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object
    }

    constructor(props) {
        super(props);

        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);

        this.state = {
            leftSidebarOpen: false,
            rightSidebarOpen: false
        };
    }

    componentWillMount() {
        this.props.actions.fetchMyChannelsAndMembers(this.props.currentTeam.Id);
    }

    openLeftSidebar = () => {
        this.setState({leftSidebarOpen: true});
    }

    closeLeftSidebar = () => {
        this.setState({leftSidebarOpen: false});
    }

    openRightSidebar = () => {
        this.setState({rightSidebarOpen: true});
    }

    closeRightSidebar = () => {
        this.setState({rightSidebarOpen: false});
    }

    render() {
        if (!this.props.currentChannel) {
            return <Loading/>;
        }

        return (
            <View style={{flex: 1}}>
                <StatusBar barStyle='default'/>
                <Drawer
                    open={this.state.leftSidebarOpen}
                    type='displace'
                    content={<ChannelSidebar currentTeam={this.props.currentTeam}/>}
                    side='left'
                    tapToClose={true}
                    onCloseStart={this.closeLeftSidebar}
                    openDrawerOffset={0.2}
                >
                    <Drawer
                        open={this.state.rightSidebarOpen}
                        type='displace'
                        content={<RightSidebarMenu/>}
                        side='right'
                        tapToClose={true}
                        onCloseStart={this.closeRightSidebar}
                        openDrawerOffset={0.2}
                    >
                        <View style={{flex: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 20}}>
                            <TouchableHighlight
                                onPress={this.openLeftSidebar}
                                style={{height: 50, width: 50}}
                            >
                                <Text>{'<'}</Text>
                            </TouchableHighlight>
                            <TouchableHighlight
                                onPress={this.openRightSidebar}
                                style={{height: 50, width: 50}}
                            >
                                <Text>{'>'}</Text>
                            </TouchableHighlight>
                        </View>
                        <Text>{this.props.currentTeam.id + ' - ' + this.props.currentTeam.name}</Text>
                        <Text>{this.props.currentChannel.id + ' - ' + this.props.currentChannel.name}</Text>
                    </Drawer>
                </Drawer>
            </View>
        );
    }
}
