// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Dimensions, Keyboard} from 'react-native';
import {intlShape} from 'react-intl';
import AsyncStorage from '@react-native-community/async-storage';

import {WebsocketEvents} from 'mattermost-redux/constants';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import DrawerLayout, {DRAWER_INITIAL_OFFSET, TABLET_WIDTH} from 'app/components/sidebars/drawer_layout';
import {DeviceTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';

import MainSidebarBase from './main_sidebar_base';

export default class MainSidebarIOS extends MainSidebarBase {
    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.drawerRef = React.createRef();
        this.state = {
            deviceWidth: Dimensions.get('window').width,
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
        EventEmitter.on('close_main_sidebar', this.closeChannelDrawer);
        EventEmitter.on(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        Dimensions.addEventListener('change', this.handleDimensions);
    }

    shouldComponentUpdate(nextProps, nextState) {
        const {currentTeamId, teamsCount, theme} = this.props;
        const {deviceWidth, openDrawerOffset, isSplitView, permanentSidebar, searching} = this.state;

        if (nextState.openDrawerOffset !== openDrawerOffset || nextState.searching !== searching || nextState.deviceWidth !== deviceWidth) {
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
        EventEmitter.off('close_main_sidebar', this.closeChannelDrawer);
        EventEmitter.off(WebsocketEvents.CHANNEL_UPDATED, this.handleUpdateTitle);
        EventEmitter.off(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
        Dimensions.removeEventListener('change', this.handleDimensions);
    }

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

    closeChannelDrawer = () => {
        if (this.state.drawerOpened && this.drawerRef?.current) {
            this.drawerRef.current.closeDrawer();
        } else if (this.drawerSwiper && DeviceTypes.IS_TABLET) {
            this.resetDrawer(true);
        }
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

    open = () => {
        EventEmitter.emit('blur_post_textbox');

        if (this.drawerRef?.current) {
            this.drawerRef.current.openDrawer();
        }
    };

    onPageSelected = (index) => {
        this.swiperIndex = index;

        if (this.drawerRef?.current) {
            this.drawerRef.current.canClose = this.swiperIndex !== 0;
        }
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