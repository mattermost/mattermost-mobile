// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import {StatusBar, Text, TouchableHighlight, View} from 'react-native';
import Drawer from 'react-native-drawer';

import ChannelSidebar from 'app/components/channel_sidebar';
import RightSidebarMenu from 'app/components/right_sidebar_menu';

import ChannelPostList from './components/channel_post_list';

export default class Channel extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            loadChannelsIfNecessary: React.PropTypes.func.isRequired,
            selectInitialChannel: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object.isRequired,
        currentChannel: React.PropTypes.object,
        channels: React.PropTypes.array,
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
        this.props.actions.loadChannelsIfNecessary(this.props.currentTeam.id).then(() => {
            return this.props.actions.selectInitialChannel(this.props.currentTeam.id);
        });
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.currentTeam.id !== nextProps.currentTeam.id) {
            this.props.actions.loadChannelsIfNecessary(nextProps.currentTeam.id).then(() => {
                this.props.actions.selectInitialChannel(nextProps.currentTeam.id);
            });
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
            currentTeam,
            currentChannel,
            channels,
            theme
        } = this.props;

        if (!currentTeam) {
            return <Text>{'Waiting on team'}</Text>;
        } else if (!currentChannel) {
            return <Text>{'Waiting on channel'}</Text>;
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
                        <ChannelPostList channel={currentChannel}/>
                    </Drawer>
                </Drawer>
            </View>
        );
    }
}
