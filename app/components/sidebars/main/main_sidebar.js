// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    BackHandler,
    Dimensions,
    Keyboard,
    StyleSheet,
    View,
} from 'react-native';
import {intlShape} from 'react-intl';
import AsyncStorage from '@react-native-community/async-storage';

import {General, WebsocketEvents} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SafeAreaView from 'app/components/safe_area_view';
import DrawerLayout, {TABLET_WIDTH} from 'app/components/sidebars/drawer_layout';
import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
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
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
        previewChannel: PropTypes.func,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        let openDrawerOffset = DRAWER_INITIAL_OFFSET;
        if (props.isLandscape || DeviceTypes.IS_TABLET) {
            openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
        }

        this.swiperIndex = 1;
        this.drawerRef = React.createRef();
        this.channelListRef = React.createRef();
        this.state = {
            show: false,
            openDrawerOffset,
            drawerOpened: false,
            searching: false,
            isSplitView: false,
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.props.actions.getTeams();
        this.handleDimensions();
        this.handlePermanentSidebar();
        EventEmitter.on('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.on('renderDrawer', this.handleShowDrawerContent);
        EventEmitter.on(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
        Dimensions.addEventListener('change', this.handleDimensions);
    }

    componentWillReceiveProps(nextProps) {
        const {isLandscape} = this.props;

        if (nextProps.isLandscape !== isLandscape) {
            if (this.state.openDrawerOffset !== 0) {
                let openDrawerOffset = DRAWER_INITIAL_OFFSET;
                if (nextProps.isLandscape || DeviceTypes.IS_TABLET) {
                    openDrawerOffset = DRAWER_LANDSCAPE_OFFSET;
                }

                this.setState({openDrawerOffset});
            }
        }
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {currentTeamId, deviceWidth, isLandscape, teamsCount, theme} = this.props;
        const {openDrawerOffset, isSplitView, permanentSidebar, show, searching} = this.state;

        if (nextState.openDrawerOffset !== openDrawerOffset || nextState.show !== show || nextState.searching !== searching) {
            return true;
        }

        return nextProps.currentTeamId !== currentTeamId ||
            nextProps.isLandscape !== isLandscape || nextProps.deviceWidth !== deviceWidth ||
            nextProps.teamsCount !== teamsCount ||
            nextProps.theme !== theme ||
            nextState.isSplitView !== isSplitView ||
            nextState.permanentSidebar !== permanentSidebar;
    }

    componentWillUnmount() {
        this.mounted = false;
        EventEmitter.off('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.off(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        EventEmitter.off('renderDrawer', this.handleShowDrawerContent);
        EventEmitter.off(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        Dimensions.addEventListener('change', this.handleDimensions);
    }

    handleAndroidBack = () => {
        if (this.state.drawerOpened && this.drawerRef?.current) {
            this.drawerRef.current.closeDrawer();
            return true;
        }

        return false;
    };

    handleDimensions = () => {
        if (DeviceTypes.IS_TABLET && this.mounted) {
            mattermostManaged.isRunningInSplitView().then((result) => {
                const isSplitView = Boolean(result.isSplitView);
                this.setState({isSplitView});
            });
        }
    };

    handlePermanentSidebar = async () => {
        if (DeviceTypes.IS_TABLET && this.mounted) {
            const enabled = await AsyncStorage.getItem(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS);
            this.setState({permanentSidebar: enabled === 'true'});
        }
    };

    handleShowDrawerContent = () => {
        requestAnimationFrame(() => this.setState({show: true}));
    };

    closeChannelDrawer = () => {
        if (this.state.drawerOpened && this.drawerRef?.current) {
            this.drawerRef.current.closeDrawer();
        } else if (this.drawerSwiper && DeviceTypes.IS_TABLET) {
            this.resetDrawer(true);
        }
    };

    drawerSwiperRef = (ref) => {
        this.drawerSwiper = ref;
    };

    handleDrawerClose = () => {
        this.setState({
            drawerOpened: false,
            searching: false,
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

        if (this.drawerRef?.current) {
            this.drawerRef.current.openDrawer();
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

        if (this.drawerRef?.current) {
            this.drawerRef.current.canClose = this.swiperIndex !== 0;
        }
    };

    onSearchEnds = () => {
        this.setState({searching: false});
    };

    onSearchStart = () => {
        if (this.drawerRef?.current) {
            this.drawerRef.current.canClose = false;
        }
        this.setState({searching: true});
    };

    showTeams = () => {
        if (this.drawerSwiper && this.props.teamsCount > 1) {
            this.drawerSwiper.showTeamsPage();
        }
    };

    resetDrawer = () => {
        if (this.drawerSwiper) {
            this.drawerSwiper.resetPage();
        }

        if (this.drawerRef?.current) {
            this.drawerRef.current.canClose = true;
        }

        if (this.channelListRef?.current) {
            this.channelListRef.current.cancelSearch();
        }
    };

    renderNavigationView = (drawerWidth) => {
        const {
            teamsCount,
            theme,
            previewChannel,
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
                this.drawerSwiper.runOnLayout();
            } else if (!openDrawerOffset) {
                this.drawerSwiper.scrollToStart();
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
                    ref={this.channelListRef}
                    onSelectChannel={this.selectChannel}
                    onJoinChannel={this.joinChannel}
                    onShowTeams={this.showTeams}
                    onSearchStart={this.onSearchStart}
                    onSearchEnds={this.onSearchEnds}
                    theme={theme}
                    drawerOpened={this.state.drawerOpened}
                    previewChannel={previewChannel}
                />
            </View>
        );

        return (
            <SafeAreaView
                navBarBackgroundColor={theme.sidebarBg}
                backgroundColor={theme.sidebarHeaderBg}
                footerColor={theme.sidebarBg}
            >
                <DrawerSwiper
                    ref={this.drawerSwiperRef}
                    onPageSelected={this.onPageSelected}
                    showTeams={showTeams}
                    drawerOpened={this.state.drawerOpened}
                    drawerWidth={drawerWidth}
                >
                    {lists}
                </DrawerSwiper>
            </SafeAreaView>
        );
    };

    render() {
        const {children, deviceWidth} = this.props;
        const {openDrawerOffset} = this.state;
        const isTablet = DeviceTypes.IS_TABLET && !this.state.isSplitView && this.state.permanentSidebar;
        const drawerWidth = DeviceTypes.IS_TABLET ? TABLET_WIDTH : (deviceWidth - openDrawerOffset);

        return (
            <DrawerLayout
                ref={this.drawerRef}
                renderNavigationView={this.renderNavigationView}
                onDrawerClose={this.handleDrawerClose}
                onDrawerOpen={this.handleDrawerOpen}
                drawerWidth={drawerWidth}
                useNativeAnimations={true}
                isTablet={isTablet}
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
