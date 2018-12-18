// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Platform,
    ScrollView,
} from 'react-native';

export default class Table extends React.PureComponent {
    static propTypes = {
        renderRows: PropTypes.func.isRequired,
        tableWidth: PropTypes.number.isRequired,
    };

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
            container = (
                <ScrollView contentContainerStyle={{width: this.props.tableWidth}}>
                    {content}
                </ScrollView>
            );
        }

        return container;
    }
}
