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
import {IntlProvider} from 'react-intl';
import AsyncStorage from '@react-native-community/async-storage';

import {General, WebsocketEvents} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import SafeAreaView from 'app/components/safe_area_view';
import {DRAWER_INITIAL_OFFSET} from 'app/components/sidebars/drawer_layout';
import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import tracker from 'app/utils/time_tracker';
import {t} from 'app/utils/i18n';

import ChannelsList from './channels_list';
import DrawerSwiper from './drawer_swiper';
import TeamsList from './teams_list';

import telemetry from 'app/telemetry';
import {getTranslations} from 'app/i18n';

import {closeMainDrawer, enableMainDrawer} from 'app/actions/navigation';

export default class ChannelSidebar extends Component {
    static propTypes = {
        actions: PropTypes.shape({
            getTeams: PropTypes.func.isRequired,
            logChannelSwitch: PropTypes.func.isRequired,
            makeDirectChannel: PropTypes.func.isRequired,
            setChannelDisplayName: PropTypes.func.isRequired,
            setChannelLoading: PropTypes.func.isRequired,
            joinChannel: PropTypes.func.isRequired,
            handleSelectChannel: PropTypes.func,
        }).isRequired,
        blurPostTextBox: PropTypes.func,
        children: PropTypes.node,
        currentTeamId: PropTypes.string.isRequired,
        currentUserId: PropTypes.string,
        teamsCount: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
        locale: PropTypes.string,
    };

    static defaultProps = {
        blurPostTextBox: () => true,
    };

    constructor(props) {
        super(props);

        this.swiperIndex = 1;
        this.drawerRef = React.createRef();
        this.channelListRef = React.createRef();
        this.state = {
            deviceWidth: Dimensions.get('window').width,
            show: false,
            openDrawerOffset: DRAWER_INITIAL_OFFSET,
            drawerOpened: false,
            searching: false,
            isSplitView: false,
        };
    }

    componentDidMount() {
        this.mounted = true;
        this.props.actions.getTeams();
        this.handleDimensions({window: Dimensions.get('window')});
        this.handlePermanentSidebar();
        EventEmitter.on('close_channel_drawer', this.closeChannelDrawer);
        EventEmitter.on('renderDrawer', this.handleShowDrawerContent);
        EventEmitter.on(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBack);
        Dimensions.addEventListener('change', this.handleDimensions);
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {currentTeamId, teamsCount, theme} = this.props;
        const {deviceWidth, openDrawerOffset, isSplitView, permanentSidebar, show, searching} = this.state;

        if (nextState.openDrawerOffset !== openDrawerOffset || nextState.show !== show || nextState.searching !== searching || nextState.deviceWidth !== deviceWidth) {
            return true;
        }

        return nextProps.currentTeamId !== currentTeamId ||
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
        Dimensions.removeEventListener('change', this.handleDimensions);
    }

    handleAndroidBack = () => {
        // if (this.state.drawerOpened && this.drawerRef?.current) {
        //     closeMainDrawer();
        //     return true;
        // }

        return false;
    };

    handleDimensions = ({window}) => {
        if (this.mounted) {
            if (DeviceTypes.IS_TABLET) {
                mattermostManaged.isRunningInSplitView().then((result) => {
                    const isSplitView = Boolean(result.isSplitView);
                    this.setState({isSplitView});
                });
            }

            if (this.state.openDrawerOffset !== 0) {
                let openDrawerOffset = DRAWER_INITIAL_OFFSET;
                if ((window.width > window.height) || DeviceTypes.IS_TABLET) {
                    openDrawerOffset = window.width * 0.5;
                }

                this.setState({openDrawerOffset, deviceWidth: window.width});
            }
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

    closeChannelDrawer = (skip) => {
        if (this.drawerSwiper && DeviceTypes.IS_TABLET) {
            this.resetDrawer(skip);
        } else {
            // this.drawerRef.current.closeDrawer();
            closeMainDrawer();
            this.handleDrawerClose();
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
        this.resetDrawer(true);
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
        const {logChannelSwitch, handleSelectChannel} = this.props.actions;

        logChannelSwitch(channel.id, currentChannelId);

        tracker.channelSwitch = Date.now();

        if (closeDrawer) {
            telemetry.start(['channel:close_drawer']);
            this.closeChannelDrawer(true);
        }

        if (!channel) {
            const utils = require('app/utils/general');
            const {intl} = this.providerRef.getChildContext();

            const unableToJoinMessage = {
                id: t('mobile.open_unknown_channel.error'),
                defaultMessage: "We couldn't join the channel. Please reset the cache and try again.",
            };
            const erroMessage = {};

            utils.alertErrorWithFallback(intl, erroMessage, unableToJoinMessage);
            return;
        }

        handleSelectChannel(channel.id);
    };

    joinChannel = (channel, currentChannelId) => {
        const {intl} = this.providerRef.getChildContext();
        const {
            actions,
            currentTeamId,
            currentUserId,
        } = this.props;

        const {
            joinChannel,
            makeDirectChannel,
            setChannelLoading,
        } = actions;

        this.closeChannelDrawer(true);
        setChannelLoading(channel.id !== currentChannelId);

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
                setChannelLoading(false);
                return;
            }

            requestAnimationFrame(() => {
                this.selectChannel(result.data.channel || result.data, currentChannelId, false);
            });
        }, 200);
    };

    onPageSelected = (index) => {
        this.swiperIndex = index;

        enableMainDrawer(this.swiperIndex !== 0);
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

    setProviderRef = (ref) => {
        this.providerRef = ref;
    }

    resetDrawer = (skip) => {
        if (this.drawerSwiper) {
            this.drawerSwiper.resetPage();
            if (!skip) {
                enableMainDrawer(true);
            }
        }

        if (this.drawerRef?.current) {
            this.drawerRef.current.canClose = true;
        }

        if (this.channelListRef?.current) {
            this.channelListRef.current.cancelSearch();
        }
    };

    renderNavigationView = () => {
        const {
            teamsCount,
            theme,
        } = this.props;

        const {
            openDrawerOffset,
            searching,
        } = this.state;

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
                />
            </View>,
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
                    drawerWidth={Dimensions.get('window').width - 60}
                    hasSafeAreaInsets={hasSafeAreaInsets}
                >
                    {lists}
                </DrawerSwiper>
            </SafeAreaView>
        );
    };

    render() {
        const locale = this.props.locale;

        if (!locale) {
            return null;
        }

        return (
            <IntlProvider
                key={locale}
                locale={'en'}
                ref={this.setProviderRef}
                messages={getTranslations('en')}
            >
                {this.renderNavigationView()}
            </IntlProvider>
        );
    }
}

const style = StyleSheet.create({
    swiperContent: {
        flex: 1,
    },
});
