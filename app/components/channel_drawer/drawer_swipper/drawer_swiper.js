// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import Swiper from 'react-native-swiper';

import {changeOpacity} from 'app/utils/theme';

export default class DrawerSwiper extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        deviceHeight: PropTypes.number.isRequired,
        deviceWidth: PropTypes.number.isRequired,
        isLandscape: PropTypes.bool.isRequired,
        onPageSelected: PropTypes.func,
        openDrawerOffset: PropTypes.number,
        showTeams: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onPageSelected: () => true,
        openDrawerOffset: 0
    };

    state = {
        index: 1
    };

    componentWillReceiveProps(nextProps) {
        if (this.refs.swiper) {
            if (nextProps.openDrawerOffset !== this.props.openDrawerOffset || nextProps.isLandscape !== this.props.isLandscape) {
                this.refs.swiper.initialRender = true;
                if (this.state.index === 1) {
                    this.resetPage();
                }
            }
        }
    }

    swiperPageSelected = (e, state, context) => {
        this.props.onPageSelected(context.state.index);
        this.setState({index: context.state.index});
    };

    showTeamsPage = () => {
        this.refs.swiper.scrollBy(-1, true);
    };

    resetPage = () => {
        this.refs.swiper.scrollBy(1, false);
    };

    render() {
        const {
            children,
            deviceHeight,
            deviceWidth,
            openDrawerOffset,
            showTeams,
            theme
        } = this.props;

        const pagination = {bottom: 0};
        if (showTeams) {
            pagination.bottom = 0;
        }

        return (
            <Swiper
                ref='swiper'
                horizontal={true}
                loop={false}
                index={this.state.index}
                onMomentumScrollEnd={this.swiperPageSelected}
                paginationStyle={[{position: 'absolute'}, pagination]}
                width={deviceWidth - openDrawerOffset}
                height={deviceHeight}
                style={{backgroundColor: theme.sidebarBg}}
                activeDotColor={theme.sidebarText}
                dotColor={changeOpacity(theme.sidebarText, 0.5)}
                removeClippedSubviews={true}
                automaticallyAdjustContentInsets={true}
                scrollEnabled={showTeams}
                showsPagination={showTeams}
                keyboardShouldPersistTaps={'always'}
            >
                {children}
            </Swiper>
        );
    }
}
