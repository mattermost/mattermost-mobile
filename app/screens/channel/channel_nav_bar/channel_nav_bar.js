// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Dimensions, Platform, View} from 'react-native';
import {intlShape} from 'react-intl';
import AsyncStorage from '@react-native-community/async-storage';

import EventEmitter from 'mattermost-redux/utils/event_emitter';

import {DeviceTypes, ViewTypes} from 'app/constants';
import mattermostManaged from 'app/mattermost_managed';
import {accessibilityProps} from 'app/utils/accessibility';
import {t} from 'app/utils/i18n';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

import ChannelDrawerButton from './channel_drawer_button';
import ChannelSearchButton from './channel_search_button';
import ChannelTitle from './channel_title';
import SettingDrawerButton from './settings_drawer_button';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

const {
    ANDROID_TOP_LANDSCAPE,
    ANDROID_TOP_PORTRAIT,
    IOS_TOP_LANDSCAPE,
    IOS_TOP_PORTRAIT,
    STATUS_BAR_HEIGHT,
} = ViewTypes;

export default class ChannelNavBar extends PureComponent {
    static propTypes = {
        isLandscape: PropTypes.bool.isRequired,
        openChannelDrawer: PropTypes.func.isRequired,
        openSettingsDrawer: PropTypes.func.isRequired,
        onPress: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape,
    };

    state = {
        isSplitView: false,
    };

    componentDidMount() {
        this.mounted = true;
        this.handleDimensions();
        this.handlePermanentSidebar();
        Dimensions.addEventListener('change', this.handleDimensions);
        EventEmitter.on(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
    }

    componentWillUnmount() {
        this.mounted = false;
        Dimensions.removeEventListener('change', this.handleDimensions);
        EventEmitter.off(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS, this.handlePermanentSidebar);
    }

    handleDimensions = () => {
        if (DeviceTypes.IS_TABLET && this.mounted) {
            mattermostManaged.isRunningInSplitView().then((result) => {
                const isSplitView = Boolean(result.isSplitView);
                this.setState({isSplitView});
            });
        }
    };

    handlePermanentSidebar = () => {
        if (DeviceTypes.IS_TABLET && this.mounted) {
            AsyncStorage.getItem(DeviceTypes.PERMANENT_SIDEBAR_SETTINGS).then((enabled) => {
                this.setState({permanentSidebar: enabled === 'true'});
            });
        }
    };

    render() {
        const {isLandscape, onPress, theme} = this.props;
        const {openChannelDrawer, openSettingsDrawer} = this.props;
        const style = getStyleFromTheme(theme);

        let height;
        let canHaveSubtitle = true;
        switch (Platform.OS) {
        case 'android':
            height = ANDROID_TOP_PORTRAIT;
            if (DeviceTypes.IS_TABLET) {
                height = ANDROID_TOP_LANDSCAPE;
            }
            break;
        case 'ios':
            height = IOS_TOP_PORTRAIT - STATUS_BAR_HEIGHT;
            if (DeviceTypes.IS_TABLET && isLandscape) {
                height -= 1;
            } else if (isLandscape) {
                height = IOS_TOP_LANDSCAPE;
                canHaveSubtitle = false;
            }

            if (DeviceTypes.IS_IPHONE_WITH_INSETS && isLandscape) {
                canHaveSubtitle = false;
            }
            break;
        }

        let drawerButtonVisible = false;
        if (!DeviceTypes.IS_TABLET || this.state.isSplitView || !this.state.permanentSidebar) {
            drawerButtonVisible = true;
        }

        return (
            <View
                {...accessibilityProps(this.context.intl.formatMessage(accessibilityLabel.channelNavBar))}
                style={[style.header, padding(isLandscape), {height}]}
            >
                <ChannelDrawerButton
                    openDrawer={openChannelDrawer}
                    visible={drawerButtonVisible}
                />
                <ChannelTitle
                    onPress={onPress}
                    canHaveSubtitle={canHaveSubtitle}
                />
                <ChannelSearchButton
                    theme={theme}
                />
                <SettingDrawerButton openDrawer={openSettingsDrawer}/>
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        header: {
            backgroundColor: theme.sidebarHeaderBg,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            width: '100%',
            zIndex: 10,
        },
    };
});

const accessibilityLabel = {
    channelNavBar: {
        id: t('accessibility.channel_nav_bar'),
        defaultMessage: 'channel nav bar',
    },
};
