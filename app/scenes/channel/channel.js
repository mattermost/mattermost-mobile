// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import {StatusBar, Text, TouchableHighlight, View} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Drawer from 'react-native-drawer';

import ChannelDrawer from 'app/components/channel_drawer';
import RightSidebarMenu from 'app/components/right_sidebar_menu';

import ChannelPostList from './components/channel_post_list';

export default class Channel extends React.Component {
    static propTypes = {
        actions: React.PropTypes.shape({
            loadChannelsIfNecessary: React.PropTypes.func.isRequired,
            loadProfilesAndTeamMembersForDMSidebar: React.PropTypes.func.isRequired,
            selectInitialChannel: React.PropTypes.func.isRequired,
            openChannelDrawer: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
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
        const teamId = this.props.currentTeam.id;
        this.loadChannels(teamId);
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.currentTeam && this.props.currentTeam.id !== nextProps.currentTeam.id) {
            const teamId = nextProps.currentTeam.id;
            this.loadChannels(teamId);
        }
    }

    loadChannels = (teamId) => {
        this.props.actions.loadChannelsIfNecessary(teamId).then(() => {
            this.props.actions.loadProfilesAndTeamMembersForDMSidebar(teamId);
            return this.props.actions.selectInitialChannel(teamId);
        });
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
                <ChannelDrawer
                    currentTeam={currentTeam}
                    currentChannelId={currentChannel.id}
                    theme={theme}
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
                        <View style={{backgroundColor: theme.sidebarHeaderBg, flexDirection: 'row', justifyContent: 'flex-start', marginTop: 20}}>
                            <View style={{flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                                <TouchableHighlight
                                    onPress={this.props.actions.openChannelDrawer}
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
                                    {currentChannel.display_name}
                                </Text>
                            </View>
                            <TouchableHighlight
                                onPress={this.openRightSidebar}
                                style={{height: 50, width: 50}}
                            >
                                <Text style={{color: theme.sidebarHeaderTextColor}}>{'>'}</Text>
                            </TouchableHighlight>
                        </View>
                        <ChannelPostList channel={currentChannel}/>
                    </Drawer>
                </ChannelDrawer>
            </View>
        );
    }
}
