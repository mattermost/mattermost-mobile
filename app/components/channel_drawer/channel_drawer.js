// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    BackHandler,
    InteractionManager,
    Keyboard,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import {General, WebsocketEvents} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import Drawer from 'app/components/drawer';
import SafeAreaView from 'app/components/safe_area_view';
import {ViewTypes} from 'app/constants';
import {alertErrorWithFallback} from 'app/utils/general';
import tracker from 'app/utils/time_tracker';

import ChannelsList from './channels_list';
import DrawerSwiper from './drawer_swipper';
import TeamsList from './teams_list';

const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
} = ViewTypes;
const DRAWER_INITIAL_OFFSET = 40;
const DRAWER_LANDSCAPE_OFFSET = 150;

export default class ChannelDrawer extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            getTeams: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func.isRequired,
            markChannelAsViewed: PropTypes.func.isRequired,
            makeDirectChannel: PropTypes.func.isRequired,
            markChannelAsRead: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired,
        }).isRequired,
        blurPostTextBox: PropTypes.func.isRequired,
        children: PropTypes.node,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        isTablet: PropTypes.bool.isRequired,
        intl: PropTypes.object.isRequired,
        navigator: PropTypes.object,
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
    };

    closeHandle = null;
    openHandle = null;
    swiperIndex = 1;

    constructor(props) {
        super(props);

        let openDrawerOffset = DRAWER_INITIAL_OFFSET;
        if (props.isLandscape || props.isTablet) {
            openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
        }
        this.state = {
            openDrawerOffset,
        };
    }

    componentWillMount() {
        this.props.actions.getTeams();
    }

    componentDidMount() {
        EventEmitter.on('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.on(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    componentWillReceiveProps(nextProps) {
        const {isLandscape} = this.props;
        if (nextProps.isLandscape !== isLandscape) {
            if (this.state.openDrawerOffset !== 0) {
                let openDrawerOffset = DRAWER_INITIAL_OFFSET;
                if (nextProps.isLandscape || this.props.isTablet) {
                    openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
                }
                this.setState({openDrawerOffset});
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {currentTeamId, isLandscape, teamsCount} = this.props;
        const {openDrawerOffset} = this.state;

        if (nextState.openDrawerOffset !== openDrawerOffset) {
            return true;
        }

        return nextProps.currentTeamId !== currentTeamId ||
            nextProps.isLandscape !== isLandscape ||
            nextProps.teamsCount !== teamsCount;
    }

    componentWillUnmount() {
        EventEmitter.off('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.off(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    handleAndroidBack = () => {
        if (this.refs.drawer && this.refs.drawer.isOpened()) {
            this.refs.drawer.close();
            return true;
        }

        return false;
    };

    closeChannelDrawer = () => {
        if (this.refs.drawer && this.refs.drawer.isOpened()) {
            this.refs.drawer.close();
        }
    };

    drawerSwiperRef = (ref) => {
        this.drawerSwiper = ref;
    };

    handleDrawerClose = () => {
        this.resetDrawer();

        if (this.closeHandle) {
            InteractionManager.clearInteractionHandle(this.closeHandle);
            this.closeHandle = null;
        }
    };

    handleDrawerCloseStart = () => {
        if (!this.closeHandle) {
            this.closeHandle = InteractionManager.createInteractionHandle();
        }
    };

    handleDrawerOpen = () => {
        if (this.state.openDrawerOffset !== 0) {
            Keyboard.dismiss();
        }

        if (this.openHandle) {
            InteractionManager.clearInteractionHandle(this.openHandle);
            this.openHandle = null;
        }
    };

    handleDrawerOpenStart = () => {
        if (!this.openHandle) {
            this.openHandle = InteractionManager.createInteractionHandle();
        }
    };

    handleDrawerTween = (ratio) => {
        const opacity = (ratio / 2);

        EventEmitter.emit('drawer_opacity', opacity);

        return {
            mainOverlay: {
                backgroundColor: this.props.theme.centerChannelBg,
                elevation: 3,
                opacity,
            },
            drawerOverlay: {
                backgroundColor: ratio ? '#000' : '#FFF',
                opacity: ratio ? (1 - ratio) / 2 : 1,
            },
        };
    };

    handleUpdateTitle = (channel) => {
        let channelName = '';
        if (channel.display_name) {
            channelName = channel.display_name;
        }
        this.props.actions.setChannelDisplayName(channelName);
    };

    openChannelDrawer = () => {
        this.props.blurPostTextBox();

        if (this.refs.drawer && !this.refs.drawer.isOpened()) {
            this.refs.drawer.open();
        }
    };

    selectChannel = (channel, currentChannelId) => {
        const {
            actions,
        } = this.props;

        const {
            handleSelectChannel,
            markChannelAsRead,
            setChannelLoading,
            setChannelDisplayName,
            markChannelAsViewed,
        } = actions;

        tracker.channelSwitch = Date.now();

        this.closeChannelDrawer();

        InteractionManager.runAfterInteractions(() => {
            setChannelLoading(channel.id !== currentChannelId);
            setChannelDisplayName(channel.display_name);

            handleSelectChannel(channel.id);
            requestAnimationFrame(() => {
                // mark the channel as viewed after all the frame has flushed
                markChannelAsRead(channel.id, currentChannelId);
                if (channel.id !== currentChannelId) {
                    markChannelAsViewed(currentChannelId);
                }
            });
        });
    };

    joinChannel = async (channel, currentChannelId) => {
        const {
            actions,
            currentTeamId,
            currentUserId,
            intl,
        } = this.props;

        const {
            joinChannel,
            makeDirectChannel,
        } = actions;

        const displayValue = {displayName: channel.display_name};

        let result;
        if (channel.type === General.DM_CHANNEL) {
            result = await makeDirectChannel(channel.id);

            if (result.error) {
                const dmFailedMessage = {
                    id: 'mobile.open_dm.error',
                    defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
                };
                alertErrorWithFallback(intl, result.error, dmFailedMessage, displayValue);
            }
        } else {
            result = await joinChannel(currentUserId, currentTeamId, channel.id);

            if (result.error) {
                const joinFailedMessage = {
                    id: 'mobile.join_channel.error',
                    defaultMessage: "We couldn't join the channel {displayName}. Please check your connection and try again.",
                };
                alertErrorWithFallback(intl, result.error, joinFailedMessage, displayValue);
            }
        }

        if (result.error) {
            return;
        }

        this.selectChannel(result.data, currentChannelId);
    };

    onPageSelected = (index) => {
        this.swiperIndex = index;
    };

    onSearchEnds = () => {
        //hack to update the drawer when the offset changes
        const {isLandscape, isTablet} = this.props;

        if (this.refs.drawer) {
            this.refs.drawer._syncAfterUpdate = true; //eslint-disable-line no-underscore-dangle
        }

        let openDrawerOffset = DRAWER_INITIAL_OFFSET;
        if (isLandscape || isTablet) {
            openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
        }
        this.setState({openDrawerOffset});
    };

    onSearchStart = () => {
        if (this.refs.drawer) {
            this.refs.drawer._syncAfterUpdate = true; //eslint-disable-line no-underscore-dangle
        }

        this.setState({openDrawerOffset: 0});
    };

    showTeams = () => {
        if (this.drawerSwiper && this.swiperIndex === 1 && this.props.teamsCount > 1) {
            this.drawerSwiper.getWrappedInstance().showTeamsPage();
        }
    };

    resetDrawer = () => {
        if (this.drawerSwiper && this.swiperIndex !== 1) {
            this.drawerSwiper.getWrappedInstance().resetPage();
        }
    };

    renderContent = () => {
        const {
            navigator,
            teamsCount,
            theme,
        } = this.props;

        const {
            openDrawerOffset,
        } = this.state;

        const multipleTeams = teamsCount > 1;
        const showTeams = openDrawerOffset !== 0 && multipleTeams;
        if (this.drawerSwiper) {
            if (multipleTeams) {
                this.drawerSwiper.getWrappedInstance().runOnLayout();
            } else if (!openDrawerOffset) {
                this.drawerSwiper.getWrappedInstance().scrollToStart();
            }
        }

        const lists = [];
        if (multipleTeams) {
            const teamsList = (
                <View
                    key='teamsList'
                    style={style.swiperContent}
                >
                    <TeamsList
                        closeChannelDrawer={this.closeChannelDrawer}
                        navigator={navigator}
                    />
                </View>
            );
            lists.push(teamsList);
        }

        lists.push(
            <View
                key='channelsList'
                style={style.swiperContent}
            >
                <ChannelsList
                    navigator={navigator}
                    onSelectChannel={this.selectChannel}
                    onJoinChannel={this.joinChannel}
                    onShowTeams={this.showTeams}
                    onSearchStart={this.onSearchStart}
                    onSearchEnds={this.onSearchEnds}
                    theme={theme}
                />
            </View>
        );

        return (
            <SafeAreaView
                backgroundColor={theme.sidebarHeaderBg}
                footerColor={theme.sidebarHeaderBg}
                navigator={navigator}
            >
                <DrawerSwiper
                    ref={this.drawerSwiperRef}
                    onPageSelected={this.onPageSelected}
                    openDrawerOffset={openDrawerOffset}
                    showTeams={showTeams}
                >
                    {lists}
                </DrawerSwiper>
            </SafeAreaView>
        );
    };

    render() {
        const {children, isLandscape} = this.props;
        const {openDrawerOffset} = this.state;

        const androidTop = isLandscape ? ANDROID_TOP_LANDSCAPE : ANDROID_TOP_PORTRAIT;
        const iosTop = isLandscape ? IOS_TOP_LANDSCAPE : IOS_TOP_PORTRAIT;

        return (
            <Drawer
                ref='drawer'
                onOpenStart={this.handleDrawerOpenStart}
                onOpen={this.handleDrawerOpen}
                onClose={this.handleDrawerClose}
                onCloseStart={this.handleDrawerCloseStart}
                captureGestures='open'
                type='static'
                acceptTap={true}
                acceptPanOnDrawer={false}
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
                bottomPanOffset={Platform.OS === 'ios' ? ANDROID_TOP_LANDSCAPE : IOS_TOP_PORTRAIT}
                topPanOffset={Platform.OS === 'ios' ? iosTop : androidTop}
                styles={{
                    main: {
                        shadowColor: '#000000',
                        shadowOpacity: 0.4,
                        shadowRadius: 12,
                        shadowOffset: {
                            width: -4,
                            height: 0,
                        },
                    },
                }}
            >
                {children}
            </Drawer>
        );
    }
}

const style = StyleSheet.create({
    swiperContent: {
        flex: 1,
        marginBottom: 10,
    },
});
