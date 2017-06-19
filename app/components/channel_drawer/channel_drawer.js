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

import ChannelsList from './channels_list';
import Swiper from './swiper';
import TeamsList from './teams_list';

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

const DRAWER_INITIAL_OFFSET = 40;

export default class ChannelDrawer extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getTeams: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func.isRequired,
            viewChannel: PropTypes.func.isRequired,
            makeDirectChannel: PropTypes.func.isRequired,
            markChannelAsRead: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired
        }).isRequired,
        blurPostTextBox: PropTypes.func.isRequired,
        children: PropTypes.node,
        channels: PropTypes.object,
        currentChannel: PropTypes.object,
        channelMembers: PropTypes.object,
        currentTeam: PropTypes.object,
        currentUserId: PropTypes.string.isRequired,
        myTeamMembers: PropTypes.object.isRequired,
        navigator: PropTypes.object,
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

    componentWillMount() {
        this.props.actions.getTeams();
    }

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
        if (this.state.openDrawerOffset === DRAWER_INITIAL_OFFSET) {
            Keyboard.dismiss();
        }
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
                elevation: 3,
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

    joinChannel = (channel) => {
        const {
            actions,
            currentChannel,
            currentTeam,
            currentUserId
        } = this.props;

        const {
            handleSelectChannel,
            joinChannel,
            makeDirectChannel,
            markChannelAsRead,
            setChannelLoading,
            viewChannel
        } = actions;

        if (channel.type === General.DM_CHANNEL) {
            markChannelAsRead(currentChannel.id);
            setChannelLoading();
            viewChannel(currentChannel.id);
            this.closeChannelDrawer();
            InteractionManager.runAfterInteractions(() => {
                makeDirectChannel(channel.id);
            });
        } else {
            markChannelAsRead(currentChannel.id);
            setChannelLoading();
            viewChannel(currentChannel.id);
            joinChannel(currentUserId, currentTeam.id, channel.id);
            this.closeChannelDrawer();
            InteractionManager.runAfterInteractions(() => {
                handleSelectChannel(channel.id);
            });
        }
    };

    onPageSelected = (index) => {
        this.swiperIndex = index;
    };

    onSearchEnds = () => {
        //hack to update the drawer when the offset changes
        this.refs.drawer._syncAfterUpdate = true; //eslint-disable-line no-underscore-dangle
        this.setState({openDrawerOffset: DRAWER_INITIAL_OFFSET});
    };

    onSearchStart = () => {
        this.refs.drawer._syncAfterUpdate = true; //eslint-disable-line no-underscore-dangle
        this.setState({openDrawerOffset: 0});
    };

    showTeams = () => {
        const teamsCount = Object.keys(this.props.myTeamMembers).length;
        if (this.swiperIndex === 1 && teamsCount > 1) {
            this.refs.swiper.showTeamsPage();
        }
    };

    resetDrawer = () => {
        if (this.swiperIndex !== 1) {
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
        const {openDrawerOffset} = this.state;
        const showTeams = openDrawerOffset === DRAWER_INITIAL_OFFSET && Object.keys(myTeamMembers).length > 1;

        let teams;
        if (showTeams) {
            teams = (
                <View style={{flex: 1, marginBottom: 10}}>
                    <TeamsList
                        closeChannelDrawer={this.closeChannelDrawer}
                        myTeamMembers={myTeamMembers}
                        navigator={navigator}
                    />
                </View>
            );
        }

        const channelsList = (
            <View style={{flex: 1, marginBottom: 10}}>
                <ChannelsList
                    currentTeam={currentTeam}
                    currentChannel={currentChannel}
                    channels={channels}
                    channelMembers={channelMembers}
                    myTeamMembers={myTeamMembers}
                    theme={theme}
                    onSelectChannel={this.selectChannel}
                    onJoinChannel={this.joinChannel}
                    navigator={navigator}
                    onShowTeams={this.showTeams}
                    onSearchStart={this.onSearchStart}
                    onSearchEnds={this.onSearchEnds}
                />
            </View>
        );

        return (
            <Swiper
                ref='swiper'
                onPageSelected={this.onPageSelected}
                openDrawerOffset={openDrawerOffset}
                showTeams={showTeams}
                theme={theme}
            >
                {teams}
                {channelsList}
            </Swiper>
        );
    };

    render() {
        const {children} = this.props;
        const {openDrawer, openDrawerOffset} = this.state;

        return (
            <Drawer
                ref='drawer'
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
                tweenDuration={100}
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
