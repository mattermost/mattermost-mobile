// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {Platform, BackAndroid} from 'react-native';
import deepEqual from 'deep-equal';

import Drawer from 'react-native-drawer';
import ChannelList from './channel_list';

export default class ChannelDrawer extends React.Component {
    static propTypes = {
        children: React.PropTypes.element.isRequired,
        actions: React.PropTypes.shape({
            selectChannel: React.PropTypes.func.isRequired,
            viewChannel: React.PropTypes.func.isRequired,
            closeDMChannel: React.PropTypes.func.isRequired,
            leaveChannel: React.PropTypes.func.isRequired,
            closeChannelDrawer: React.PropTypes.func.isRequired,
            shouldDisableChannelDrawer: React.PropTypes.func.isRequired,
            markFavorite: React.PropTypes.func.isRequired,
            unmarkFavorite: React.PropTypes.func.isRequired
        }).isRequired,
        currentTeam: React.PropTypes.object,
        currentChannel: React.PropTypes.object,
        channels: React.PropTypes.object,
        channelMembers: React.PropTypes.object,
        theme: React.PropTypes.object.isRequired,
        channelDrawerOpened: React.PropTypes.bool.isRequired,
        channelDrawerDisabled: React.PropTypes.bool.isRequired
    };

    constructor(props) {
        super(props);

        this.handleBackButton = this.handleBackButton.bind(this);
        this.handleDisableDrawer = this.handleDisableDrawer.bind(this);
    }

    componentDidMount() {
        if (Platform.OS === 'android') {
            BackAndroid.addEventListener('hardwareBackPress', this.handleBackButton);
        }
    }

    componentWillUnmount() {
        if (Platform.OS === 'android') {
            BackAndroid.removeEventListener('hardwareBackPress', this.handleBackButton);
        }
    }

    shouldComponentUpdate(nextProps) {
        return !deepEqual(this.props, nextProps, {strict: true});
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.channelDrawerOpened && nextProps.channelDrawerOpened) {
            this.drawer.open();
        } else if (this.props.channelDrawerOpened && !nextProps.channelDrawerOpened) {
            this.drawer.close();
        }
    }

    handleBackButton() {
        if (this.props.channelDrawerOpened) {
            this.props.actions.closeChannelDrawer();
            return true;
        }
        return false;
    }

    handleDisableDrawer(value) {
        this.props.actions.shouldDisableChannelDrawer(value);
    }

    render() {
        const {
            currentChannel,
            currentTeam,
            channels,
            channelMembers,
            theme
        } = this.props;

        return (
            <Drawer
                ref={(ref) => {
                    this.drawer = ref;
                }}
                onClose={this.props.actions.closeChannelDrawer}
                type='displace'
                openDrawerOffset={0.2}
                closedDrawerOffset={0}
                panOpenMask={0.1}
                panCloseMask={0.2}
                panThreshold={0.2}
                acceptPan={true}
                tapToClose={true}
                negotiatePan={true}
                disabled={this.props.channelDrawerDisabled}
                content={
                    <ChannelList
                        currentTeam={currentTeam}
                        currentChannel={currentChannel}
                        channels={channels}
                        channelMembers={channelMembers}
                        theme={theme}
                        onSelectChannel={this.props.actions.selectChannel}
                        onViewChannel={this.props.actions.viewChannel}
                        handleCloseDM={this.props.actions.closeDMChannel}
                        handleLeaveChannel={this.props.actions.leaveChannel}
                        closeChannelDrawer={this.props.actions.closeChannelDrawer}
                        handleDisableDrawer={this.handleDisableDrawer}
                        markFavorite={this.props.actions.markFavorite}
                        unmarkFavorite={this.props.actions.unmarkFavorite}
                    />
                    }
            >
                {this.props.children}
            </Drawer>
        );
    }
}
