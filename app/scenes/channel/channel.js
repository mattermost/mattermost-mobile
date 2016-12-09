// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';

import PureRenderMixin from 'react-addons-pure-render-mixin';

import Drawer from 'react-native-drawer';
import ChannelSidebar from 'app/components/channel_sidebar';
import Loading from 'app/components/loading';
import RightSidebarMenu from 'app/components/right_sidebar_menu';
import {StatusBar, Text, TouchableHighlight, View} from 'react-native';

export default class Channel extends React.Component {
    static propTypes = {
        actions: React.PropTypes.object.isRequired,
        currentTeam: React.PropTypes.object.isRequired,
        currentChannel: React.PropTypes.object,
        channels: React.PropTypes.arrayOf(React.PropTypes.object).isRequired
    };

    constructor(props) {
        super(props);

        this.shouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);

        this.state = {
            leftSidebarOpen: false,
            rightSidebarOpen: false
        };
    }

    componentWillMount() {
        this.props.actions.fetchMyChannelsAndMembers(this.props.currentTeam.id);
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.currentTeam.id !== nextProps.currentTeam.id) {
            this.props.actions.fetchMyChannelsAndMembers(nextProps.currentTeam.id);
        }
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
                    content={
                        <ChannelSidebar
                            currentTeam={this.props.currentTeam}
                            channels={this.props.channels}
                        />
                    }
                    side='left'
                    tapToClose={true}
                    onCloseStart={this.closeLeftSidebar}
                    openDrawerOffset={0.2}
                >
                    <Drawer
                        open={this.state.rightSidebarOpen}
                        type='displace'
                        content={<RightSidebarMenu onClose={this.closeRightSidebar}/>}
                        side='right'
                        tapToClose={true}
                        onCloseStart={this.closeRightSidebar}
                        openDrawerOffset={0.2}
                    >
                        <View style={{backgroundColor: 'skyblue', flex: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
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
