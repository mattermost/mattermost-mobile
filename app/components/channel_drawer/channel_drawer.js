// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {
    BackHandler,
    Dimensions,
    InteractionManager,
    Keyboard,
    Platform,
    View,
    ViewPagerAndroid
} from 'react-native';
import Swiper from 'react-native-swiper';

import Drawer from 'app/components/drawer';
import ChannelDrawerList from 'app/components/channel_drawer_list';
import ChannelDrawerTeams from 'app/components/channel_drawer_teams';
import {changeOpacity} from 'app/utils/theme';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');

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
        openDrawerOffset: 40
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

    swiperPageSelectedAndroid = (event) => {
        this.swiperIndex = event.nativeEvent.position;
    };

    swiperPageSelectedIos = (e, state, context) => {
        this.swiperIndex = context.state.index;
    };

    showTeams = () => {
        const teamsCount = Object.keys(this.props.myTeamMembers).length;
        if (this.swiperIndex === 1 && teamsCount > 1) {
            if (Platform.OS === 'android') {
                this.swiper.setPage(0);
            } else {
                this.swiper.scrollBy(-1, true);
            }
        }
    };

    resetDrawer = () => {
        const teamsCount = Object.keys(this.props.myTeamMembers).length;
        if (this.swiperIndex === 0 && teamsCount > 1) {
            if (Platform.OS === 'android') {
                this.swiper.setPageWithoutAnimation(1);
            } else {
                this.swiper.scrollBy(1, false);
            }
        }
    };

    renderAndroid = (theme, teams, channelsList, showTeams) => {
        return (
            <ViewPagerAndroid
                ref={(r) => {
                    this.swiper = r;
                }}
                style={{flex: 1, backgroundColor: theme.sidebarBg}}
                initialPage={1}
                scrollEnabled={showTeams}
                onPageSelected={this.swiperPageSelectedAndroid}
            >
                {teams}
                {channelsList}
            </ViewPagerAndroid>
        );
    };

    renderIos = (theme, teams, channelsList, showTeams) => {
        const {openDrawerOffset} = this.state;

        return (
            <Swiper
                ref={(r) => {
                    this.swiper = r;
                }}
                horizontal={true}
                loop={false}
                index={1}
                onMomentumScrollEnd={this.swiperPageSelectedIos}
                paginationStyle={{position: 'relative', bottom: 10}}
                width={deviceWidth - openDrawerOffset}
                height={deviceHeight}
                style={{backgroundColor: theme.sidebarBg}}
                activeDotColor={theme.sidebarText}
                dotColor={changeOpacity(theme.sidebarText, 0.5)}
                removeClippedSubviews={true}
                automaticallyAdjustContentInsets={true}
                scrollEnabled={showTeams}
                showsPagination={showTeams}
            >
                {teams}
                {channelsList}
            </Swiper>
        );
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

        if (Platform.OS === 'android') {
            return this.renderAndroid(theme, teams, channelsList, showTeams);
        }

        return this.renderIos(theme, teams, channelsList, showTeams);
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
