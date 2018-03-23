// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {StyleSheet} from 'react-native';

import {changeOpacity} from 'app/utils/theme';

import Swiper from 'app/components/swiper';

export default class DrawerSwiper extends Component {
    static propTypes = {
        children: PropTypes.node.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        onPageSelected: PropTypes.func,
        openDrawerOffset: PropTypes.number,
        showTeams: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static defaultProps = {
        onPageSelected: () => true,
        openDrawerOffset: 0,
    };

    shouldComponentUpdate(nextProps) {
        const {deviceWidth, showTeams, theme} = this.props;
        return nextProps.deviceWidth !== deviceWidth ||
            nextProps.showTeams !== showTeams || nextProps.theme !== theme;
    }

    runOnLayout = (shouldRun = true) => {
        if (this.refs.swiper) {
            this.refs.swiper.runOnLayout = shouldRun;
        }
    };

    resetPage = () => {
        if (this.refs.swiper) {
            this.refs.swiper.scrollToIndex(1, false);
        }
    };

    scrollToStart = () => {
        if (this.refs.swiper) {
            this.refs.swiper.scrollToStart();
        }
    };

    swiperPageSelected = (index) => {
        this.props.onPageSelected(index);
    };

    showTeamsPage = () => {
        if (this.refs.swiper) {
            this.refs.swiper.scrollToIndex(0, true);
        }
    };

    render() {
        const {
            children,
            deviceWidth,
            openDrawerOffset,
            showTeams,
            theme,
        } = this.props;

        const initialPage = React.Children.count(children) - 1;

        return (
            <Swiper
                ref='swiper'
                initialPage={initialPage}
                onIndexChanged={this.swiperPageSelected}
                paginationStyle={style.pagination}
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

const style = StyleSheet.create({
    pagination: {
        bottom: 0,
        position: 'absolute',
    },
});
