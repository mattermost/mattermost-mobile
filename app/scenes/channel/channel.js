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
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
        channels: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
        theme: React.PropTypes.object.isRequired
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
        if (this.props.currentTeam && nextProps.currentTeam && this.props.currentTeam.id !== nextProps.currentTeam.id) {
            this.props.actions.fetchMyChannelsAndMembers(nextProps.currentTeam.id);
        }
    }

    openLeftSidebar = () => {
        this.setState({leftSidebarOpen: true});
    };

    closeLeftSidebar = () => {
        this.setState({leftSidebarOpen: false});
    };

    openRightSidebar = () => {
        this.setState({rightSidebarOpen: true});
    };

    closeRightSidebar = () => {
        this.setState({rightSidebarOpen: false});
    };

    render() {
        const {
            currentChannel,
            currentTeam,
            channels,
            theme
        } = this.props;

        if (!currentChannel) {
            return <Loading/>;
        }

        return (
            <View style={{flex: 1, backgroundColor: theme.centerChannelBg}}>
                <StatusBar barStyle='default'/>
                <Drawer
                    open={this.state.leftSidebarOpen}
                    type='displace'
                    content={
                        <ChannelSidebar
                            currentTeam={currentTeam}
                            channels={channels}
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
                        <View style={{backgroundColor: theme.sidebarHeaderBg, flexDirection: 'row', justifyContent: 'space-between', marginTop: 20}}>
                            <TouchableHighlight
                                onPress={this.openLeftSidebar}
                                style={{height: 50, width: 50}}
                            >
                                <Text style={{color: theme.sidebarHeaderTextColor}}>{'<'}</Text>
                            </TouchableHighlight>
                            <TouchableHighlight
                                onPress={this.openRightSidebar}
                                style={{height: 50, width: 50}}
                            >
                                <Text style={{color: theme.sidebarHeaderTextColor}}>{'>'}</Text>
                            </TouchableHighlight>
                        </View>
                        <View style={{flex: 1}}>
                            <Text style={{color: theme.centerChannelColor}}>{currentTeam.id + ' - ' + currentTeam.name}</Text>
                            <Text style={{color: theme.centerChannelColor}}>{currentChannel.id + ' - ' + currentChannel.name}</Text>
                        </View>
                    </Drawer>
                </Drawer>
            </View>
        );
    }
}
