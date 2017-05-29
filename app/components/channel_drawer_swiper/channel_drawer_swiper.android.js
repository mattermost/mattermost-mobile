// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ViewPagerAndroid} from 'react-native';

export default class ChannelDrawerSwiper extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        onPageSelected: PropTypes.func,
        showTeams: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onPageSelected: () => true
    };

    swiperPageSelected = (event) => {
        this.props.onPageSelected(event.nativeEvent.position);
    };

    showTeamsPage = () => {
        this.refs.swiper.setPage(0);
    };

    resetPage = () => {
        this.refs.swiper.setPageWithoutAnimation(1);
    };

    render() {
        const {
            children,
            showTeams,
            theme
        } = this.props;

        return (
            <ViewPagerAndroid
                ref='swiper'
                style={{flex: 1, backgroundColor: theme.sidebarBg}}
                initialPage={1}
                scrollEnabled={showTeams}
                onPageSelected={this.swiperPageSelected}
            >
                {children}
            </ViewPagerAndroid>
        );
    }
}
