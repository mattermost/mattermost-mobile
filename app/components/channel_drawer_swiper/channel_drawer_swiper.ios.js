// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {Dimensions} from 'react-native';
import Swiper from 'react-native-swiper';

import {changeOpacity} from 'app/utils/theme';

const {height: deviceHeight, width: deviceWidth} = Dimensions.get('window');

export default class ChannelDrawerSwiper extends PureComponent {
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

        return (
            <Swiper
                ref='swiper'
                horizontal={true}
                loop={false}
                index={1}
                onMomentumScrollEnd={this.swiperPageSelected}
                paginationStyle={{position: 'relative', bottom: 10}}
                width={deviceWidth - openDrawerOffset}
                height={deviceHeight}
                style={{backgroundColor: theme.sidebarBg}}
                activeDotColor={theme.sidebarText}
                dotColor={changeOpacity(theme.sidebarText, 0.5)}
                removeClippedSubviews={true}
                automaticallyAdjustContentInsets={true}
                scrollEnabled={showTeams}
                showsPagination={showTeams}
            >
                {children}
            </Swiper>
        );
    }
}
