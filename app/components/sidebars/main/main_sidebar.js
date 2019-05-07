// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    BackHandler,
    Keyboard,
    StyleSheet,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';

import {General, WebsocketEvents} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SafeAreaView from 'app/components/safe_area_view';
import DrawerLayout from 'app/components/sidebars/drawer_layout';
import tracker from 'app/utils/time_tracker';
import {t} from 'app/utils/i18n';

import ChannelsList from './channels_list';
import DrawerSwiper from './drawer_swipper';
import TeamsList from './teams_list';

import telemetry from 'app/telemetry';

const DRAWER_INITIAL_OFFSET = 40;
const DRAWER_LANDSCAPE_OFFSET = 150;

export default class ChannelSidebar extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            getTeams: PropTypes.func.isRequired,
            logChannelSwitch: PropTypes.func.isRequired,
            makeDirectChannel: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired,
        }).isRequired,
        blurPostTextBox: PropTypes.func.isRequired,
        children: PropTypes.node,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        isTablet: PropTypes.bool.isRequired,
        navigator: PropTypes.object,
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        let openDrawerOffset = DRAWER_INITIAL_OFFSET;
        if (props.isLandscape || props.isTablet) {
            openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
        }

        this.swiperIndex = 1;
        this.state = {
            show: false,
            openDrawerOffset,
            drawerOpened: false,
            searching: false,
        };
    }

    componentWillMount() {
        this.props.actions.getTeams();
    }

    componentDidMount() {
        EventEmitter.on('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.on('renderDrawer', this.handleShowDrawerContent);
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
        const {currentTeamId, deviceWidth, isLandscape, teamsCount} = this.props;
        const {openDrawerOffset, show, searching} = this.state;

        if (nextState.openDrawerOffset !== openDrawerOffset || nextState.show !== show || nextState.searching !== searching) {
            return true;
        }

        return nextProps.currentTeamId !== currentTeamId ||
            nextProps.isLandscape !== isLandscape || nextProps.deviceWidth !== deviceWidth ||
            nextProps.teamsCount !== teamsCount;
    }

    componentWillUnmount() {
        EventEmitter.off('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.off(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        EventEmitter.off('renderDrawer', this.handleShowDrawerContent);
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
    }

    handleAndroidBack = () => {
        if (this.state.drawerOpened && this.refs.drawer) {
            this.refs.drawer.closeDrawer();
            return true;
        }

        return false;
    };

    handleShowDrawerContent = () => {
        this.setState({show: true});
    };

    closeChannelDrawer = () => {
        if (this.state.drawerOpened && this.refs.drawer) {
            this.refs.drawer.closeDrawer();
        }
    };

    drawerSwiperRef = (ref) => {
        this.drawerSwiper = ref;
    };

    handleDrawerClose = () => {
        this.setState({
            drawerOpened: false,
        });
        this.resetDrawer();
        Keyboard.dismiss();
    };

    handleDrawerOpen = () => {
        this.setState({
            drawerOpened: true,
        });
    };

    handleUpdateTitle = (channel) => {
        let channelName = '';
        if (channel.display_name) {
            channelName = channel.display_name;
        }
        this.props.actions.setChannelDisplayName(channelName);
    };

    openChannelSidebar = () => {
        this.props.blurPostTextBox();

        if (this.refs.drawer) {
            this.refs.drawer.openDrawer();
        }
    };

    selectChannel = (channel, currentChannelId, closeDrawer = true) => {
        const {logChannelSwitch, setChannelLoading} = this.props.actions;

        logChannelSwitch(channel.id, currentChannelId);

        tracker.channelSwitch = Date.now();

        if (closeDrawer) {
            telemetry.start(['channel:close_drawer']);
            this.closeChannelDrawer();
            setChannelLoading(channel.id !== currentChannelId);
        }

        if (!channel) {
            const utils = require('app/utils/general');
            const {intl} = this.context;

            const unableToJoinMessage = {
                id: t('mobile.open_unknown_channel.error'),
                defaultMessage: "We couldn't join the channel. Please reset the cache and try again.",
            };
            const erroMessage = {};

            utils.alertErrorWithFallback(intl, erroMessage, unableToJoinMessage);
            setChannelLoading(false);
            return;
        }

        EventEmitter.emit('switch_channel', channel, currentChannelId);
    };

    joinChannel = (channel, currentChannelId) => {
        const {intl} = this.context;
        const {
            actions,
            currentTeamId,
            currentUserId,
        } = this.props;

        const {
            joinChannel,
            makeDirectChannel,
        } = actions;

        this.closeChannelDrawer();
        actions.setChannelLoading(channel.id !== currentChannelId);

        setTimeout(async () => {
            const displayValue = {displayName: channel.display_name};
            const utils = require('app/utils/general');

            let result;
            if (channel.type === General.DM_CHANNEL) {
                result = await makeDirectChannel(channel.id, false);

                if (result.error) {
                    const dmFailedMessage = {
                        id: t('mobile.open_dm.error'),
                        defaultMessage: "We couldn't open a direct message with {displayName}. Please check your connection and try again.",
                    };
                    utils.alertErrorWithFallback(intl, result.error, dmFailedMessage, displayValue);
                }
            } else {
                result = await joinChannel(currentUserId, currentTeamId, channel.id);

                if (result.error || !result.data || !result.data.channel) {
                    const joinFailedMessage = {
                        id: t('mobile.join_channel.error'),
                        defaultMessage: "We couldn't join the channel {displayName}. Please check your connection and try again.",
                    };
                    utils.alertErrorWithFallback(intl, result.error, joinFailedMessage, displayValue);
                }
            }

            if (result.error || (!result.data && !result.data.channel)) {
                actions.setChannelLoading(false);
                return;
            }

            requestAnimationFrame(() => {
                this.selectChannel(result.data.channel || result.data, currentChannelId, false);
            });
        }, 200);
    };

    onPageSelected = (index) => {
        this.swiperIndex = index;

        if (this.refs.drawer) {
            if (this.swiperIndex === 0) {
                this.refs.drawer.canClose = false;
            } else {
                this.refs.drawer.canClose = true;
            }
        }
    };

    onSearchEnds = () => {
        this.setState({searching: false});
    };

    onSearchStart = () => {
        if (this.refs.drawer) {
            this.refs.drawer.canClose = false;
        }
        this.setState({searching: true});
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

    renderNavigationView = () => {
        const {
            navigator,
            teamsCount,
            theme,
        } = this.props;

        const {
            show,
            openDrawerOffset,
            searching,
        } = this.state;

        if (!show) {
            return null;
        }

        const multipleTeams = teamsCount > 1;
        const showTeams = !searching && multipleTeams;
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
                    drawerOpened={this.state.drawerOpened}
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
                    drawerOpened={this.state.drawerOpened}
                >
                    {lists}
                </DrawerSwiper>
            </SafeAreaView>
        );
    };

    render() {
        const {children, deviceWidth} = this.props;
        const {openDrawerOffset} = this.state;

        return (
            <DrawerLayout
                ref='drawer'
                renderNavigationView={this.renderNavigationView}
                onDrawerClose={this.handleDrawerClose}
                onDrawerOpen={this.handleDrawerOpen}
                drawerWidth={deviceWidth - openDrawerOffset}
                useNativeAnimations={true}
            >
                {children}
            </DrawerLayout>
        );
    }
}

const style = StyleSheet.create({
    swiperContent: {
        flex: 1,
    },
});
