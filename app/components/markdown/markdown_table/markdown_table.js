// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {PropTypes} from 'prop-types';
import React from 'react';
import {intlShape} from 'react-intl';
import {
    Dimensions,
    ScrollView,
    View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/FontAwesome';

import {CELL_MAX_WIDTH, CELL_MIN_WIDTH} from 'app/components/markdown/markdown_table_cell/markdown_table_cell';
import TouchableWithFeedback from 'app/components/touchable_with_feedback';
import {preventDoubleTap} from 'app/utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {goToScreen} from 'app/actions/navigation';
import {DeviceTypes} from 'app/constants';

const MAX_HEIGHT = 300;
const MAX_PREVIEW_COLUMNS = 5;

export default class MarkdownTable extends React.PureComponent {
    static propTypes = {
        children: PropTypes.node.isRequired,
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
            maxPreviewColumns: MAX_PREVIEW_COLUMNS,
            cellWidth: 0,
        };
    }

    componentDidMount() {
        Dimensions.addEventListener('change', this.setMaxPreviewColumns);
    }

    componentWillUnmount() {
        Dimensions.removeEventListener('change', this.setMaxPreviewColumns);
    }

    setMaxPreviewColumns = ({window}) => {
        const maxPreviewColumns = Math.floor(window.width / CELL_MIN_WIDTH);
        this.setState({maxPreviewColumns});
    }

    getTableWidth = (isFullView = false) => {
        let columns = this.props.numColumns;

        if (columns > MAX_PREVIEW_COLUMNS) {
            columns = MAX_PREVIEW_COLUMNS;
        }

        return isFullView || columns === 1 ? columns * CELL_MAX_WIDTH : columns * CELL_MIN_WIDTH;
    };

    handlePress = preventDoubleTap(() => {
        const {intl} = this.context;
        const screen = 'Table';
        const title = intl.formatMessage({
            id: 'mobile.routes.table',
            defaultMessage: 'Table',
        });
        const passProps = {
            renderRows: this.renderRows,
            tableWidth: this.getTableWidth(true),
            renderAsFlex: this.shouldRenderAsFlex(true),
        };

        goToScreen(screen, title, passProps);
    });

    handleContainerLayout = (e) => {
        this.setState({
            containerWidth: e.nativeEvent.layout.width,
        });
    };

    handleContentSizeChange = (contentWidth, contentHeight) => {
        this.setState({
            contentHeight,
        });
    };

    renderPreviewRows = (isFullView = false) => {
        const {maxPreviewColumns} = this.state;
        const tableStyle = this.getTableStyle(isFullView);

        // Add an extra prop to the last row of the table so that it knows not to render a bottom border
        // since the container should be rendering that
        const rows = React.Children.toArray(this.props.children).slice(0, maxPreviewColumns).map((row) => {
            const children = React.Children.toArray(row.props.children).slice(0, maxPreviewColumns);
            return {
                ...row,
                props: {
                    ...row.props,
                    children,
                },
            };
        });
        rows[rows.length - 1] = React.cloneElement(rows[rows.length - 1], {
            isLastRow: true,
        });

        return (
            <View style={tableStyle}>
                {rows}
            </View>
        );
    }

    shouldRenderAsFlex = (isFullView = false) => {
        const {numColumns} = this.props;
        const {height, width} = Dimensions.get('window');
        const isLandscape = width > height;

        // render as flex in the channel screen, only for mobile phones on the portrait mode,
        // and if tables have 2 ~ 4 columns
        if (!isFullView && numColumns > 1 && numColumns < 4 && !DeviceTypes.IS_TABLET) {
            return true;
        }

        // render a 4 column table as flex when in landscape mode only
        // otherwise it should expand beyond the device's full width
        if (!isFullView && isLandscape && numColumns === 4) {
            return true;
        }

        // render as flex in full table screen, only for mobile phones on portrait mode,
        // and if tables have 3 or 4 columns
        if (isFullView && numColumns >= 3 && numColumns <= 4 && !DeviceTypes.IS_TABLET) {
            return true;
        }

        return false;
    }

    getTableStyle = (isFullView) => {
        const {theme} = this.props;
        const style = getStyleSheet(theme);
        const tableStyle = [style.table];

        const renderAsFlex = this.shouldRenderAsFlex(isFullView);
        if (renderAsFlex) {
            tableStyle.push(style.displayFlex);
            return tableStyle;
        }

        tableStyle.push({width: this.getTableWidth(isFullView)});
        return tableStyle;
    }

    renderRows = (isFullView = false) => {
        const tableStyle = this.getTableStyle(isFullView);

        // Add an extra prop to the last row of the table so that it knows not to render a bottom border
        // since the container should be rendering that
        const rows = React.Children.toArray(this.props.children);
        rows[rows.length - 1] = React.cloneElement(rows[rows.length - 1], {
            isLastRow: true,
        });

        // Add an extra prop to the first row of the table so that it can have a different background color
        rows[0] = React.cloneElement(rows[0], {
            isFirstRow: true,
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
        const tableWidth = this.getTableWidth();
        const renderAsFlex = this.shouldRenderAsFlex();

        let leftOffset;
        if (renderAsFlex || tableWidth > this.state.containerWidth) {
            leftOffset = this.state.containerWidth - 20;
        } else {
            leftOffset = tableWidth - 20;
        }

        // Renders when table width exceeds the container, or if the columns exceed maximum allowed for previews
        if ((this.state.containerWidth && tableWidth > this.state.containerWidth && !renderAsFlex) ||
            (this.props.numColumns > MAX_PREVIEW_COLUMNS)) {
            moreRight = (
                <LinearGradient
                    colors={[
                        changeOpacity(this.props.theme.centerChannelColor, 0.0),
                        changeOpacity(this.props.theme.centerChannelColor, 0.1),
                    ]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[style.moreRight, {height: this.state.contentHeight, left: leftOffset}]}
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
                    style={[style.moreBelow, renderAsFlex ? style.fullWidth : {width: tableWidth}]}
                />
            );
        }

        const expandButton = (
            <TouchableWithFeedback
                type={'opacity'}
                onPress={this.handlePress}
                style={[style.expandButton, {left: leftOffset}]}
            >
                <Icon
                    name={'expand'}
                    style={style.icon}
                />
            </TouchableWithFeedback>
        );

        return (
            <TouchableWithFeedback
                style={style.tablePadding}
                onPress={this.handlePress}
                type={'opacity'}
            >
                <ScrollView
                    onContentSizeChange={this.handleContentSizeChange}
                    onLayout={this.handleContainerLayout}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    style={style.container}
                >
                    {this.renderPreviewRows()}
                </ScrollView>
                {moreRight}
                {moreBelow}
                {expandButton}
            </TouchableWithFeedback>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        container: {
            maxHeight: MAX_HEIGHT,
        },
        expandButton: {
            height: 30,
            width: 30,
            borderWidth: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRadius: 15,
            bottom: 20,
            backgroundColor: theme.centerChannelBg,
        },
        icon: {
            fontSize: 15,
            color: theme.linkColor,
        },
        displayFlex: {
            flex: 1,
        },
        fullWidth: {
            width: '100%',
        },
        table: {
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderWidth: 1,
        },
        tablePadding: {
            paddingRight: 10,
        },
        moreBelow: {
            bottom: 30,
            height: 20,
            position: 'absolute',
            left: 0,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
        },
        moreRight: {
            maxHeight: MAX_HEIGHT,
            position: 'absolute',
            top: 0,
            width: 20,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
        },
    };
});
