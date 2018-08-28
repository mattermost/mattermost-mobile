// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import RecyclerViewList, {DataSource, RecyclerRefreshControl} from 'react-native-recyclerview-list';

import {ListTypes} from 'app/constants';

import PostListBase from './post_list_base';

const SCROLL_UP_MULTIPLIER = 3.5;

export default class PostList extends PostListBase {
    constructor(props) {
        super(props);

        this.contentOffsetY = 0;

        this.state = {
            refreshing: false,
            managedConfig: {},
            dataSource: new DataSource(props.postIds, this.keyExtractor),
        };
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.channelId !== nextProps.channelId) {
            this.contentOffsetY = 0;
            this.contentHeight = 0;
        }

        if (nextProps.postIds !== this.props.postIds) {
            this.setState({
                dataSource: new DataSource(nextProps.postIds, this.keyExtractor),
            });
        }
    }

    handleLayout = (layoutHeight, contentWidth, contentHeight) => {
        if (layoutHeight && contentHeight < layoutHeight) {
            // We still have less than 1 screen of posts loaded with more to get, so load more
            this.props.onLoadMoreUp();
        }
    };

    handleScroll = (event) => {
        const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;

        if (!this.postListHeight) {
            this.handleLayout(layoutMeasurement.height, contentSize.width, contentSize.height);
        }

        this.postListHeight = layoutMeasurement.height;

        if (contentOffset.y >= 0) {
            const definedHeight = Math.round(this.postListHeight) * SCROLL_UP_MULTIPLIER;
            const pageOffsetY = contentOffset.y;
            const contentHeight = contentSize.height;
            const direction = (this.contentOffsetY < pageOffsetY) ?
                ListTypes.VISIBILITY_SCROLL_DOWN :
                ListTypes.VISIBILITY_SCROLL_UP;
            this.contentOffsetY = contentOffset.y;

            switch (direction) {
            case ListTypes.VISIBILITY_SCROLL_DOWN:
                if ((Math.round(contentHeight - pageOffsetY) < definedHeight)) {
                    this.props.onLoadMoreDown();
                }
                break;
            case ListTypes.VISIBILITY_SCROLL_UP:
                if (Math.round(pageOffsetY) < definedHeight) {
                    this.props.onLoadMoreUp();
                }
                break;
            }
        }
    };

    render() {
        const {
            channelId,
            initialIndex,
            postIds,
        } = this.props;

        const otherProps = {};
        if (postIds.length) {
            otherProps.ListFooterComponent = this.props.renderFooter();
        } else {
            otherProps.ListEmptyComponent = this.props.renderFooter();
        }

        const hasPostsKey = postIds.length ? 'true' : 'false';
        return (
            <RecyclerRefreshControl
                key={`recyclerFor-${channelId}-${hasPostsKey}`}
                colors={['red', 'blue']}
                direction='bottom'
                enabled={Boolean(channelId)}
                onRefresh={this.handleRefresh}
                refreshing={this.state.refreshing}
                style={styles.flex}
            >
                <RecyclerViewList
                    key={`${channelId}-${hasPostsKey}`}
                    ref={'list'}
                    style={[styles.flex, styles.postListContent]}
                    dataSource={this.state.dataSource}
                    renderItem={this.renderItem}
                    initialScrollIndex={initialIndex}
                    initialScrollPosition={RecyclerViewList.Constants.ScrollPosition.CENTER}
                    inverted={true}
                    onScroll={this.handleScroll}
                    onContentSizeChange={this.onContentSizeChange}
                    windowSize={60}
                    {...otherProps}
                />
            </RecyclerRefreshControl>
        );
    }
}

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    postListContent: {
        paddingTop: 5,
    },
});
