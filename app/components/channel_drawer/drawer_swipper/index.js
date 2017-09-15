// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Dimensions} from 'react-native';
import Swiper from 'react-native-swiper';

import {changeOpacity} from 'app/utils/theme';

export default class DrawerSwiper extends PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        onPageSelected: PropTypes.func,
        openDrawerOffset: PropTypes.number,
        showTeams: PropTypes.bool.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        onPageSelected: () => true,
        openDrawerOffset: 0
    };

    componentWillReceiveProps(nextProps) {
        if (nextProps.openDrawerOffset !== this.props.openDrawerOffset && this.refs.swiper) {
            this.refs.swiper.initialRender = true;
        }
    }

    swiperPageSelected = (e, state, context) => {
        this.props.onPageSelected(context.state.index);
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
            openDrawerOffset,
            showTeams,
            theme
        } = this.props;

        const pagination = {bottom: 0};
        if (showTeams) {
            pagination.bottom = 0;
        }

        // Get the dimensions here so when the orientation changes we get the right dimensions
        const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');

        return (
            <Swiper
                ref='swiper'
                horizontal={true}
                loop={false}
                index={1}
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
