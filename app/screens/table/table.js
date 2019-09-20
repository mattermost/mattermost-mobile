// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
    Platform,
    ScrollView,
} from 'react-native';
import {makeStyleSheetFromTheme} from 'app/utils/theme';

export default class Table extends React.PureComponent {
    static propTypes = {
        renderRows: PropTypes.func.isRequired,
        tableWidth: PropTypes.number.isRequired,
        renderAsFlex: PropTypes.bool.isRequired,
    };

    render() {
        const style = getStyleSheet();
        const content = this.props.renderRows(true);
        const viewStyle = this.props.renderAsFlex ? style.displayFlex : {width: this.props.tableWidth};

        let container;
        if (Platform.OS === 'android') {
            // On Android, ScrollViews can only handle one direction at once, so use two ScrollViews that go in
            // different directions. This prevents diagonal scrolling, so only do it on Android when totally necessary.
            container = (
                <ScrollView>
                    <ScrollView
                        contentContainerStyle={viewStyle}
                        horizontal={true}
                    >
                        {content}
                    </ScrollView>
                </ScrollView>
            );
        } else {
            container = (
                <ScrollView contentContainerStyle={viewStyle}>
                    {content}
                </ScrollView>
            );
        }

        return container;
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        displayFlex: {
            flex: 1,
        },
    };
});
