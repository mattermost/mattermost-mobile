// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import PropTypes from 'prop-types';
import React from 'react';
import {
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

        return (
            <ScrollView>
                <ScrollView
                    contentContainerStyle={viewStyle}
                    horizontal={true}
                >
                    {content}
                </ScrollView>
            </ScrollView>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        displayFlex: {
            flex: 1,
        },
    };
});
