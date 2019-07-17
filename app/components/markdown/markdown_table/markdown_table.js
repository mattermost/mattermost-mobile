// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
import {CELL_WIDTH} from 'app/components/markdown/markdown_table_cell/markdown_table_cell';

const MAX_HEIGHT = 300;

export default class MarkdownTable extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
        navigator: PropTypes.object.isRequired,
        numColumns: PropTypes.number.isRequired,
        theme: PropTypes.object.isRequired,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);

        this.state = {
            containerWidth: 0,
            contentHeight: 0,
            contentWidth: 0,
        };
    }

    getTableWidth = () => {
        return this.props.numColumns * CELL_WIDTH;
    };

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
                tableWidth: this.getTableWidth(),
            },
            navigatorStyle: {
                navBarTextColor: theme.sidebarHeaderTextColor,
                navBarBackgroundColor: theme.sidebarHeaderBg,
                navBarButtonColor: theme.sidebarHeaderTextColor,
                screenBackgroundColor: theme.centerChannelBg,
            },
        });
    });

    handleContainerLayout = (e) => {
        this.setState({
            containerWidth: e.nativeEvent.layout.width,
        });
    };

    handleContentSizeChange = (contentWidth, contentHeight) => {
        this.setState({
            contentHeight,
            contentWidth,
        });
    };

    renderRows = (drawExtraBorders = true) => {
        const style = getStyleSheet(this.props.theme);

        const tableStyle = [style.table];
        if (drawExtraBorders) {
            tableStyle.push(style.tableExtraBorders);
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

        let moreRight = null;
        if (this.state.containerWidth && this.state.contentWidth > this.state.containerWidth) {
            moreRight = (
                <LinearGradient
                    colors={[
                        changeOpacity(this.props.theme.centerChannelColor, 0.0),
                        changeOpacity(this.props.theme.centerChannelColor, 0.1),
                    ]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={style.moreRight}
                />
            );
        }

        let moreBelow = null;
        if (this.state.contentHeight > MAX_HEIGHT) {
            moreBelow = (
                <LinearGradient
                    colors={[
                        changeOpacity(this.props.theme.centerChannelColor, 0.0),
                        changeOpacity(this.props.theme.centerChannelColor, 0.1),
                    ]}
                    style={style.moreBelow}
                />
            );
        }

        return (
            <TouchableOpacity onPress={this.handlePress}>
                <ScrollView
                    contentContainerStyle={{width: this.getTableWidth()}}
                    onContentSizeChange={this.handleContentSizeChange}
                    onLayout={this.handleContainerLayout}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    style={[style.container, {maxWidth: this.getTableWidth()}]}
                >
                    {this.renderRows(false)}
                </ScrollView>
                {moreRight}
                {moreBelow}
            </TouchableOpacity>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            borderBottomWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            maxHeight: MAX_HEIGHT,
        },
        table: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderTopWidth: 1,
        },
        tableExtraBorders: {
            borderBottomWidth: 1,
            borderRightWidth: 1,
        },
        moreBelow: {
            bottom: 0,
            height: 20,
            position: 'absolute',
            right: 0,
            width: '100%',
        },
        moreRight: {
            height: '100%',
            position: 'absolute',
            right: 0,
            top: 0,
            width: 20,
        },
    };
});
