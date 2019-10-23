// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
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

import {General} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SafeAreaView from 'app/components/safe_area_view';
import DrawerLayout, {DRAWER_INITIAL_OFFSET, TABLET_WIDTH} from 'app/components/sidebars/drawer_layout';
import {DeviceTypes, Events} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import tracker from 'app/utils/time_tracker';
import {t} from 'app/utils/i18n';

import ChannelsList from './channels_list';
import DrawerSwiper from './drawer_swiper';
import TeamsList from './teams_list';

import telemetry from 'app/telemetry';

export default class MainSidebar extends PureComponent {
    static propTypes = {
        blurPostTextBox: PropTypes.func.isRequired,
        children: PropTypes.node,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string.isRequired,
        getTeams: PropTypes.func.isRequired,
        handleSelectChannel: PropTypes.func.isRequired,
        joinChannel: PropTypes.func.isRequired,
        logChannelSwitch: PropTypes.func.isRequired,
        makeDirectChannel: PropTypes.func.isRequired,
        previewChannel: PropTypes.func,
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        const {height, width} = Dimensions.get('window');
        const isLandscape = width > height;
        let openDrawerOffset = DRAWER_INITIAL_OFFSET;
        if (isLandscape || DeviceTypes.IS_TABLET) {
            openDrawerOffset = width * 0.5;
        }

        this.swiperIndex = 1;
        this.drawerRef = React.createRef();
        this.channelListRef = React.createRef();
        this.state = {
            deviceWidth: width,
            show: false,
            openDrawerOffset,
            drawerOpened: false,
            searching: false,
            isSplitView: false,
            isLandscape,
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.props.getTeams();
        this.handleDimensions({window: Dimensions.get('window')});
        this.handlePermanentSidebar();
        EventEmitter.on('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.on('renderDrawer', this.handleShowDrawerContent);
        EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
        Dimensions.addEventListener('change', this.handleDimensions);
    }

    componentWillUnmount() {
        this.mounted = false;
        EventEmitter.off('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.off('renderDrawer', this.handleShowDrawerContent);
        EventEmitter.off(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBack);
        Dimensions.removeEventListener('change', this.handleDimensions);
    }

    handleAndroidBack = () => {
        if (this.state.drawerOpened && this.drawerRef?.current) {
            this.drawerRef.current.closeDrawer();
            return true;
        }

        return false;
    };

    handleDimensions = ({window}) => {
        const {deviceWidth, openDrawerOffset} = this.state;
        const {height, width} = window;
        const nextIsLandscape = width > height;
        let nextOpenDrawerOffset = openDrawerOffset;

        if (deviceWidth !== width) {
            if (openDrawerOffset !== 0) {
                nextOpenDrawerOffset = DRAWER_INITIAL_OFFSET;
                if (nextIsLandscape || DeviceTypes.IS_TABLET) {
                    nextOpenDrawerOffset = width * 0.5;
                }
            }
        }

        const nextState = {
            deviceWidth: width,
            isLandscape: nextIsLandscape,
            openDrawerOffset: nextOpenDrawerOffset,
        };

        if (DeviceTypes.IS_TABLET) {
            mattermostManaged.isRunningInSplitView().then((result) => {
                const isSplitView = Boolean(result.isSplitView);
                if (this.mounted) {
                    this.setState({isSplitView, ...nextState});
                }
            });
        } else if (this.mounted) {
            this.setState(nextState);
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

    openChannelSidebar = () => {
        this.props.blurPostTextBox();

        if (this.drawerRef?.current) {
            this.drawerRef.current.openDrawer();
        }
    };

    selectChannel = (channel, currentChannelId, closeDrawer = true) => {
        const {handleSelectChannel, logChannelSwitch} = this.props;

        logChannelSwitch(channel.id, currentChannelId);

        tracker.channelSwitch = Date.now();

        if (closeDrawer) {
            telemetry.start(['channel:close_drawer']);
            this.closeChannelDrawer();
            EventEmitter.emit(Events.SET_CHANNEL_LOADING, channel.id !== currentChannelId);
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
            EventEmitter.emit(Events.SET_CHANNEL_LOADING, false);
            return;
        }

        requestAnimationFrame(() => {
            handleSelectChannel(channel.id);
        });
    };

    joinChannel = (channel, currentChannelId) => {
        const {intl} = this.context;
        const {
            currentTeamId,
            currentUserId,
            joinChannel,
            makeDirectChannel,
        } = this.props;

        this.closeChannelDrawer();
        EventEmitter.emit(Events.SET_CHANNEL_LOADING, channel.id !== currentChannelId);

        setTimeout(async () => {
            const displayValue = {displayName: channel.displayName};
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
                EventEmitter.emit(Events.SET_CHANNEL_LOADING, false);
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
            currentTeamId,
            teamsCount,
            theme,
            previewChannel,
        } = this.props;

        const {
            drawerOpened,
            isLandscape,
            show,
            openDrawerOffset,
            searching,
        } = this.state;

        if (!show) {
            return null;
        }

        const hasSafeAreaInsets = DeviceTypes.IS_IPHONE_WITH_INSETS || mattermostManaged.hasSafeAreaInsets;
        const multipleTeams = teamsCount > 1;
        const showTeams = !searching && multipleTeams;
        if (this.drawerSwiper) {
            if (multipleTeams) {
                this.drawerSwiper.runOnLayout();
                this.drawerSwiper.scrollToInitial();
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
                        currentTeamId={currentTeamId}
                        isLandscape={isLandscape}
                        theme={theme}
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
                    currentTeamId={currentTeamId}
                    drawerOpened={drawerOpened}
                    isLandscape={isLandscape}
                    ref={this.channelListRef}
                    onSelectChannel={this.selectChannel}
                    onJoinChannel={this.joinChannel}
                    onShowTeams={this.showTeams}
                    onSearchStart={this.onSearchStart}
                    onSearchEnds={this.onSearchEnds}
                    previewChannel={previewChannel}
                    teamsCount={teamsCount}
                    theme={theme}
                />
            </View>
        );

        return (
            <SafeAreaView
                excludeFooter={true}
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
                    hasSafeAreaInsets={hasSafeAreaInsets}
                    theme={theme}
                >
                    {lists}
                </DrawerSwiper>
            </SafeAreaView>
        );
    };

    render() {
        const {children} = this.props;
        const {deviceWidth, openDrawerOffset} = this.state;
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
