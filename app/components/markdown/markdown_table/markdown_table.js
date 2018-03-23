// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {PropTypes} from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';
import {
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

const MAX_HEIGHT = 120;

export default class MarkdownTable extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        navigator: PropTypes.object.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            contentCutOff: true,
        };
    }

    handlePress = preventDoubleTap(() => {
        const {navigator, theme} = this.props;

        navigator.push({
            screen: 'Table',
            title: this.context.intl.formatMessage({
                id: 'mobile.routes.table',
                defaultMessage: 'Table',
            }),
            animated: true,
            backButtonTitle: '',
            passProps: {
                renderRows: this.renderRows,
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    handleContentHeightChange = (contentWidth, contentHeight) => {
        this.setState({
            contentCutOff: contentHeight >= MAX_HEIGHT,
        });
    }

    renderRows = (drawBottomBorder = true) => {
        const style = getStyleSheet(this.props.theme);

        const tableStyle = [style.table];
        if (drawBottomBorder) {
            tableStyle.push(style.tableBottomBorder);
        }

        // Add an extra prop to the last row of the table so that it knows not to render a bottom border
        // since the container should be rendering that
        const rows = React.Children.toArray(this.props.children);
        rows[rows.length - 1] = React.cloneElement(rows[rows.length - 1], {
            isLastRow: true,
        });

        return (
            <View style={tableStyle}>
                {rows}
            </View>
        );
    }

    render() {
        const style = getStyleSheet(this.props.theme);

        let moreIndicator = null;
        if (this.state.contentCutOff) {
            moreIndicator = (
                <LinearGradient
                    colors={[
                        changeOpacity(this.props.theme.centerChannelColor, 0.0),
                        changeOpacity(this.props.theme.centerChannelColor, 0.1),
                    ]}
                    style={style.moreIndicator}
                />
            );
        }

        return (
            <TouchableOpacity onPress={this.handlePress}>
                <ScrollView
                    onContentSizeChange={this.handleContentHeightChange}
                    style={style.container}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                >
                    {this.renderRows(false)}
                </ScrollView>
                {moreIndicator}
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            maxHeight: MAX_HEIGHT,
        },
        table: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1, // The right border is drawn by the MarkdownTableCell component
            borderTopWidth: 1,
            flex: 1,
        },
        tableBottomBorder: {
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
        moreIndicator: {
            bottom: 0,
            height: 20,
            position: 'absolute',
            right: 0,
            width: '100%',
        },
    };
});
