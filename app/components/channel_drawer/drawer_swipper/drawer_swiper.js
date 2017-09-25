// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';

import {changeOpacity} from 'app/utils/theme';

import Swiper from 'app/components/swiper';

export default class DrawerSwiper extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        onPageSelected: PropTypes.func,
        openDrawerOffset: PropTypes.number,
        showTeams: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onPageSelected: () => true,
        openDrawerOffset: 0
    };

    runOnLayout = (shouldRun = true) => {
        this.refs.swiper.runOnLayout = shouldRun;
    };

    resetPage = () => {
        this.refs.swiper.scrollToIndex(1, false);
    };

    scrollToStart = () => {
        this.refs.swiper.scrollToStart();
    };

    swiperPageSelected = (index) => {
        this.props.onPageSelected(index);
    };

    showTeamsPage = () => {
        this.refs.swiper.scrollToIndex(0, true);
    };

    render() {
        const {
            children,
            deviceWidth,
            openDrawerOffset,
            showTeams,
            theme
        } = this.props;

        return (
            <Swiper
                ref='swiper'
                horizontal={true}
                loop={false}
                initialPage={1}
                onIndexChanged={this.swiperPageSelected}
                paginationStyle={{position: 'absolute', bottom: 0}}
                width={deviceWidth - openDrawerOffset}
                style={{backgroundColor: theme.sidebarBg}}
                activeDotColor={theme.sidebarText}
                dotColor={changeOpacity(theme.sidebarText, 0.5)}
                scrollEnabled={showTeams}
                showsPagination={showTeams}
                keyboardShouldPersistTaps={'always'}
            >
                {children}
            </Swiper>
        );
    }
}
