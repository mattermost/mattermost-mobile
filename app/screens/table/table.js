// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
} from 'react-native';
import {paddingHorizontal as padding} from 'app/components/safe_area_view/iphone_x_spacing';

export default class Table extends React.PureComponent {
    static propTypes = {
        renderRows: PropTypes.func.isRequired,
        tableWidth: PropTypes.number.isRequired,
    };

    constructor(props) {
        super(props);

        const {width, height} = Dimensions.get('window');
        const isLandscape = width > height;
        this.state = {isLandscape};
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.handleDimensionChange);
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.handleDimensionChange);
    }

    handleDimensionChange = ({window}) => {
        const {width, height} = window;
        const isLandscape = width > height;
        this.setState({isLandscape});
    }

    render() {
        const content = this.props.renderRows();

        let container;
        if (Platform.OS === 'android') {
            // On Android, ScrollViews can only handle one direction at once, so use two ScrollViews that go in
            // different directions. This prevents diagonal scrolling, so only do it on Android when totally necessary.
            container = (
                <ScrollView>
                    <ScrollView horizontal={true}>
                        {content}
                    </ScrollView>
                </ScrollView>
            );
        } else {
            const {isLandscape} = this.state;

            container = (
                <ScrollView
                    style={padding(isLandscape)}
                    contentContainerStyle={{width: this.props.tableWidth}}
                >
                    {content}
                </ScrollView>
            );
        }

        return container;
    }
}
