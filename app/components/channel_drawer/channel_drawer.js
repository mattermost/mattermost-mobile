// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {BackAndroid, InteractionManager, Keyboard} from 'react-native';

import Drawer from 'app/components/drawer';
import ChannelDrawerList from 'app/components/channel_drawer_list';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

export default class ChannelDrawer extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            handleSelectChannel: PropTypes.func.isRequired,
            viewChannel: PropTypes.func.isRequired,
            markChannelAsRead: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired
        }).isRequired,
        blurPostTextBox: PropTypes.func.isRequired,
        navigator: PropTypes.object,
        children: PropTypes.node,
        currentTeam: PropTypes.object,
        currentChannel: PropTypes.object,
        channels: PropTypes.object,
        channelMembers: PropTypes.object,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
    };

    state = {
        openDrawer: false
    };

    componentDidMount() {
        EventEmitter.on('open_channel_drawer', this.openChannelDrawer);
        EventEmitter.on('close_channel_drawer', this.closeChannelDrawer);
        BackAndroid.addEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    componentWillUnmount() {
        EventEmitter.off('open_channel_drawer', this.openChannelDrawer);
        EventEmitter.off('close_channel_drawer', this.closeChannelDrawer);
        BackAndroid.removeEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    handleAndroidBack = () => {
        if (this.state.openDrawer) {
            this.setState({openDrawer: false});
            return true;
        }

        return false;
    };

    closeChannelDrawer = () => {
        this.setState({openDrawer: false});
    };

    handleDrawerClose = () => {
        setTimeout(() => {
            InteractionManager.clearInteractionHandle(this.closeLeftHandle);
        });
    };

    handleDrawerCloseStart = () => {
        this.closeLeftHandle = InteractionManager.createInteractionHandle();
    };

    handleDrawerOpen = () => {
        this.setState({openDrawer: true});
        Keyboard.dismiss();
        setTimeout(() => {
            InteractionManager.clearInteractionHandle(this.openLeftHandle);
        });
    };

    handleDrawerOpenStart = () => {
        this.openLeftHandle = InteractionManager.createInteractionHandle();
    };

    handleDrawerTween = (ratio) => {
        const opacity = (ratio / 2);

        EventEmitter.emit('drawer_opacity', opacity);

        return {
            mainOverlay: {
                backgroundColor: this.props.theme.centerChannelBg,
                opacity
            },
            drawerOverlay: {
                backgroundColor: ratio ? '#000' : '#FFF',
                opacity: ratio ? (1 - ratio) / 2 : 1
            }
        };
    };

    openChannelDrawer = () => {
        this.props.blurPostTextBox();
        this.setState({openDrawer: true});
    };

    selectChannel = (id) => {
        const {
            actions,
            currentChannel
        } = this.props;

        const {
            handleSelectChannel,
            markChannelAsRead,
            setChannelLoading,
            viewChannel
        } = actions;

        markChannelAsRead(id, currentChannel.id);
        setChannelLoading();
        viewChannel(id, currentChannel.id);
        this.closeChannelDrawer();
        InteractionManager.runAfterInteractions(() => {
            handleSelectChannel(id);
        });
    };

    render() {
        const {
            children,
            currentChannel,
            currentTeam,
            channels,
            channelMembers,
            navigator,
            theme
        } = this.props;

        return (
            <Drawer
                open={this.state.openDrawer}
                onOpenStart={this.handleDrawerOpenStart}
                onOpen={this.handleDrawerOpen}
                onCloseStart={this.handleDrawerCloseStart}
                onClose={this.handleDrawerClose}
                captureGestures='open'
                type='static'
                acceptTap={true}
                disabled={false}
                content={
                    <ChannelDrawerList
                        currentTeam={currentTeam}
                        currentChannel={currentChannel}
                        channels={channels}
                        channelMembers={channelMembers}
                        theme={theme}
                        onSelectChannel={this.selectChannel}
                        navigator={navigator}
                    />
                }
                tapToClose={true}
                openDrawerOffset={40}
                onRequestClose={this.closeChannelDrawer}
                panOpenMask={0.2}
                panCloseMask={40}
                panThreshold={0.25}
                acceptPan={true}
                negotiatePan={true}
                useInteractionManager={false}
                tweenHandler={this.handleDrawerTween}
                elevation={-5}
                styles={{
                    main: {
                        shadowColor: '#000000',
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        shadowOffset: {
                            width: -4,
                            height: 0
                        }
                    }
                }}
            >
                {children}
            </Drawer>
        );
    }
}
