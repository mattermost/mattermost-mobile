// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {ListView, Platform, Text, View} from 'react-native';

import Loading from 'app/components/loading';
import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

export default class CustomList extends PureComponent {
    static propTypes = {
        data: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
        searching: PropTypes.bool,
        onListEndReached: PropTypes.func,
        onListEndReachedThreshold: PropTypes.number,
        loading: PropTypes.bool,
        loadingText: PropTypes.object,
        listPageSize: PropTypes.number,
        listInitialSize: PropTypes.number,
        listScrollRenderAheadDistance: PropTypes.number,
        showSections: PropTypes.bool,
        onRowPress: PropTypes.func,
        selectable: PropTypes.bool,
        onRowSelect: PropTypes.func,
        renderRow: PropTypes.func.isRequired,
        createSections: PropTypes.func,
        showNoResults: PropTypes.bool,
    };

    static defaultProps = {
        searching: false,
        onListEndReached: () => true,
        onListEndReachedThreshold: 50,
        listPageSize: 10,
        listInitialSize: 10,
        listScrollRenderAheadDistance: 200,
        loadingText: null,
        selectable: false,
        createSections: () => true,
        showSections: true,
        showNoResults: true,
    };

    constructor(props) {
        super(props);

        this.state = this.buildDataSource(props);
    }

    componentWillReceiveProps(nextProps) {
        const {data, showSections, searching} = nextProps;

        if (searching || searching !== this.props.searching) {
            this.setState(this.buildDataSource(nextProps));
        } else if (data !== this.props.data || showSections !== this.props.showSections) {
            let newData = data;
            if (showSections) {
                newData = this.props.createSections(data);
            }

            const mergedData = Object.assign({}, newData, this.state.data);
            const dataSource = showSections ? this.state.dataSource.cloneWithRowsAndSections(mergedData) : this.state.dataSource.cloneWithRows(mergedData);
            this.setState({
                data: mergedData,
                dataSource,
            });
        }
    }

    buildDataSource = (props) => {
        const ds = new ListView.DataSource({
            rowHasChanged: (r1, r2) => r1 !== r2,
            sectionHeaderHasChanged: (s1, s2) => s1 !== s2,
        });
        let newData = props.data;
        if (props.showSections) {
            newData = this.props.createSections(props.data);
        }
        const dataSource = props.showSections ? ds.cloneWithRowsAndSections(newData) : ds.cloneWithRows(newData);
        return {
            data: newData,
            dataSource,
        };
    };

    handleRowSelect = (sectionId, rowId) => {
        const data = this.state.data;
        const section = [...data[sectionId]];

        section[rowId] = Object.assign({}, section[rowId], {selected: !section[rowId].selected});
        const mergedData = Object.assign({}, data, {[sectionId]: section});

        const id = section[rowId].id;

        const dataSource = this.state.dataSource.cloneWithRowsAndSections(mergedData);
        this.setState({
            data: mergedData,
            dataSource,
        }, () => this.props.onRowSelect(id));
    };

    renderSectionHeader = (sectionData, sectionId) => {
        const style = getStyleFromTheme(this.props.theme);
        return (
            <View style={style.sectionWrapper}>
                <View style={style.sectionContainer}>
                    <Text style={style.sectionText}>{sectionId}</Text>
                </View>
            </View>
        );
    };

    renderRow = (item, sectionId, rowId) => {
        const props = {
            id: item.id,
            item,
            selected: item.selected,
            selectable: this.props.selectable,
            onPress: this.props.onRowPress,
        };

        if ('disableSelect' in item) {
            props.enabled = !item.disableSelect;
        }

        if (this.props.onRowSelect) {
            props.onPress = this.handleRowSelect.bind(this, sectionId, rowId);
        } else {
            props.onPress = this.props.onRowPress;
        }

        // Allow passing in a component like UserListRow or ChannelListRow
        if (this.props.renderRow.prototype.isReactComponent) {
            const RowComponent = this.props.renderRow;
            return <RowComponent {...props}/>;
        }

        return this.props.renderRow(props);
    };

    renderSeparator = (sectionId, rowId) => {
        const style = getStyleFromTheme(this.props.theme);
        return (
            <View
                key={`${sectionId}-${rowId}`}
                style={style.separator}
            />
        );
    };

    renderFooter = () => {
        const {theme} = this.props;
        const style = getStyleFromTheme(theme);
        if (!this.props.loading || !this.props.loadingText) {
            return null;
        }

        const backgroundColor = this.props.data.length > 0 ? theme.centerChannelBg : '#0000';

        return (
            <View style={{height: 70, backgroundColor, alignItems: 'center', justifyContent: 'center'}}>
                <FormattedText
                    {...this.props.loadingText}
                    style={style.loadingText}
                />
            </View>
        );
    };

    render() {
        const {
            data,
            listInitialSize,
            listPageSize,
            listScrollRenderAheadDistance,
            loading,
            onListEndReached,
            onListEndReachedThreshold,
            searching,
            showNoResults,
            showSections,
            theme,
        } = this.props;
        const {dataSource} = this.state;
        const style = getStyleFromTheme(theme);
        let noResults = false;

        if (typeof data === 'object') {
            noResults = Object.keys(data).length === 0;
        } else {
            noResults = data.length === 0;
        }

        let loadingComponent;
        if (loading && searching) {
            loadingComponent = (
                <View
                    style={style.searching}
                >
                    <Loading/>
                </View>
            );
        }

        if (showNoResults && noResults) {
            return (
                <View style={style.noResultContainer}>
                    <FormattedText
                        id='mobile.custom_list.no_results'
                        defaultMessage='No Results'
                        style={style.noResultText}
                    />
                </View>
            );
        }

        return (
            <View style={{flex: 1}}>
                <ListView
                    style={style.listView}
                    dataSource={dataSource}
                    renderRow={this.renderRow}
                    renderSectionHeader={showSections ? this.renderSectionHeader : null}
                    renderSeparator={this.renderSeparator}
                    renderFooter={this.renderFooter}
                    enableEmptySections={true}
                    onEndReached={onListEndReached}
                    onEndReachedThreshold={onListEndReachedThreshold}
                    pageSize={listPageSize}
                    initialListSize={listInitialSize}
                    scrollRenderAheadDistance={listScrollRenderAheadDistance}
                />
                {loadingComponent}
            </View>
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return {
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            ...Platform.select({
                android: {
                    marginBottom: 20,
                },
            }),
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6),
        },
        searching: {
            backgroundColor: theme.centerChannelBg,
            height: '100%',
            position: 'absolute',
            width: '100%',
        },
        sectionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            paddingLeft: 10,
            paddingVertical: 2,
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg,
        },
        sectionText: {
            fontWeight: '600',
            color: theme.centerChannelColor,
        },
        separator: {
            height: 1,
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
        },
        noResultContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5),
        },
    };
});
