// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {FlatList, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';

import VirtualList from './virtual_list';

export default class InvertibleFlatList extends PureComponent {
    static propTypes = {
        horizontal: PropTypes.bool,
        inverted: PropTypes.bool,
        ListFooterComponent: PropTypes.func,
        renderItem: PropTypes.func.isRequired,
        theme: PropTypes.object.isRequired
    };

    static defaultProps = {
        horizontal: false,
        inverted: true
    };

    constructor(props) {
        super(props);

        this.inversionDirection = props.horizontal ? styles.horizontal : styles.vertical;
    }

    getMetrics = () => {
        return this.flatListRef.getMetrics();
    };

    recordInteraction = () => {
        this.flatListRef.recordInteraction();
    };

    renderFooter = () => {
        const {ListFooterComponent: footer} = this.props;
        if (!footer) {
            return null;
        }

        return (
            <View style={[styles.container, this.inversionDirection]}>
                {footer()}
            </View>
        );
    };

    renderItem = (info) => {
        return (
            <View style={[styles.container, this.inversionDirection]}>
                {this.props.renderItem(info)}
            </View>
        );
    };

    renderScrollComponent = (props) => {
        const {theme} = this.props;

        if (props.onRefresh) {
            return (
                <ScrollView
                    {...props}
                    refreshControl={
                        <RefreshControl
                            refreshing={props.refreshing}
                            onRefresh={props.onRefresh}
                            tintColor={theme.centerChannelColor}
                            colors={[theme.centerChannelColor]}
                            style={this.inversionDirection}
                        />
                    }
                />
            );
        }

        return <ScrollView {...props}/>;
    };

    scrollToEnd = (params) => {
        this.flatListRef.scrollToEnd(params);
    };

    scrollToIndex = (params) => {
        this.flatListRef.scrollToIndex(params);
    };

    scrollToItem = (params) => {
        this.flatListRef.scrollToItem(params);
    };

    scrollToOffset = (params) => {
        this.flatListRef.scrollToOffset(params);
    };

    setFlatListRef = (flatListRef) => {
        this.flatListRef = flatListRef;
    };

    render() {
        const {inverted, ...forwardedProps} = this.props;

        // If not inverted, render as an ordinary FlatList
        if (!inverted) {
            return (
                <FlatList
                    {...forwardedProps}
                />
            );
        }

        return (
            <View style={[styles.container, this.inversionDirection]}>
                <VirtualList
                    ref={this.setFlatListRef}
                    {...forwardedProps}
                    ListFooterComponent={this.renderFooter}
                    renderItem={this.renderItem}
                    renderScrollComponent={this.renderScrollComponent}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    vertical: {
        transform: [{scaleY: -1}]
    },
    horizontal: {
        transform: [{scaleX: -1}]
    }
});

