// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    BackHandler,
    InteractionManager,
    Keyboard,
    View
} from 'react-native';

import Drawer from 'app/components/drawer';
import ChannelDrawerList from 'app/components/channel_drawer_list';
import ChannelDrawerSwiper from 'app/components/channel_drawer_swiper';
import ChannelDrawerTeams from 'app/components/channel_drawer_teams';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

const DRAWER_INITIAL_OFFSET = 40;

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
        myTeamMembers: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        currentTeam: {},
        currentChannel: {}
    };

    state = {
        openDrawer: false,
        openDrawerOffset: DRAWER_INITIAL_OFFSET
    };

    swiperIndex = 1;

    componentDidMount() {
        EventEmitter.on('open_channel_drawer', this.openChannelDrawer);
        EventEmitter.on('close_channel_drawer', this.closeChannelDrawer);
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    componentWillUnmount() {
        EventEmitter.off('open_channel_drawer', this.openChannelDrawer);
        EventEmitter.off('close_channel_drawer', this.closeChannelDrawer);
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
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
        this.resetDrawer();
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

    onPageSelected = (index) => {
        this.swiperIndex = index;
    };

    showTeams = () => {
        const teamsCount = Object.keys(this.props.myTeamMembers).length;
        if (this.swiperIndex === 1 && teamsCount > 1) {
            this.refs.swiper.showTeamsPage();
        }
    };

    resetDrawer = () => {
        const teamsCount = Object.keys(this.props.myTeamMembers).length;
        if (this.swiperIndex === 0 && teamsCount > 1) {
            this.refs.swiper.resetPage();
        }
    };

    renderContent = () => {
        const {
            currentChannel,
            currentTeam,
            channels,
            channelMembers,
            navigator,
            myTeamMembers,
            theme
        } = this.props;
        const showTeams = Object.keys(myTeamMembers).length > 1;

        let teams;
        if (showTeams) {
            teams = (
                <View style={{flex: 1, marginBottom: 10}}>
                    <ChannelDrawerTeams
                        closeChannelDrawer={this.closeChannelDrawer}
                        myTeamMembers={myTeamMembers}
                    />
                </View>
            );
        }

        const channelsList = (
            <View style={{flex: 1, marginBottom: 10}}>
                <ChannelDrawerList
                    currentTeam={currentTeam}
                    currentChannel={currentChannel}
                    channels={channels}
                    channelMembers={channelMembers}
                    myTeamMembers={myTeamMembers}
                    theme={theme}
                    onSelectChannel={this.selectChannel}
                    navigator={navigator}
                    onShowTeams={this.showTeams}
                />
            </View>
        );

        return (
            <ChannelDrawerSwiper
                ref='swiper'
                onPageSelected={this.onPageSelected}
                openDrawerOffset={this.state.openDrawerOffset}
                showTeams={showTeams}
                theme={theme}
            >
                {teams}
                {channelsList}
            </ChannelDrawerSwiper>
        );
    };

    render() {
        const {children} = this.props;
        const {openDrawer, openDrawerOffset} = this.state;

        return (
            <Drawer
                open={openDrawer}
                onOpenStart={this.handleDrawerOpenStart}
                onOpen={this.handleDrawerOpen}
                onCloseStart={this.handleDrawerCloseStart}
                onClose={this.handleDrawerClose}
                captureGestures='open'
                type='static'
                acceptTap={true}
                disabled={false}
                content={this.renderContent()}
                tapToClose={true}
                openDrawerOffset={openDrawerOffset}
                onRequestClose={this.closeChannelDrawer}
                panOpenMask={0.2}
                panCloseMask={openDrawerOffset}
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
