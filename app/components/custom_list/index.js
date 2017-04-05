// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.
import React, {PropTypes, PureComponent} from 'react';
import {ListView, Platform, StyleSheet, Text, View} from 'react-native';
import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

export default class CustomList extends PureComponent {
    static propTypes = {
        data: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
        searching: PropTypes.bool,
        onRowPress: PropTypes.func,
        onListEndReached: PropTypes.func,
        onListEndReachedThreshold: PropTypes.number,
        preferences: PropTypes.object,
        loading: PropTypes.bool,
        loadingText: PropTypes.object,
        listPageSize: PropTypes.number,
        listInitialSize: PropTypes.number,
        listScrollRenderAheadDistance: PropTypes.number,
        showSections: PropTypes.bool,
        selectable: PropTypes.bool,
        onRowSelect: PropTypes.func,
        renderRow: PropTypes.func.isRequired,
        createSections: PropTypes.func,
        showNoResults: PropTypes.bool
    };

    static defaultProps = {
        searching: false,
        onListEndReached: () => true,
        onListEndReachedThreshold: 50,
        listPageSize: 10,
        listInitialSize: 10,
        listScrollRenderAheadDistance: 200,
        selectable: false,
        loadingText: null,
        onRowSelect: () => true,
        createSections: () => true,
        showSections: true,
        showNoResults: true
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
                dataSource
            });
        }
    }

    buildDataSource = (props) => {
        const ds = new ListView.DataSource({
            rowHasChanged: (r1, r2) => r1 !== r2,
            sectionHeaderHasChanged: (s1, s2) => s1 !== s2
        });
        let newData = props.data;
        if (props.showSections) {
            newData = this.props.createSections(props.data);
        }
        const dataSource = props.showSections ? ds.cloneWithRowsAndSections(newData) : ds.cloneWithRows(newData);
        return {
            data: newData,
            dataSource
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
            dataSource
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

    renderRow = (rowData, sectionId, rowId) => {
        return this.props.renderRow(
            rowData,
            sectionId,
            rowId,
            this.props.preferences,
            this.props.theme,
            this.props.selectable,
            this.props.onRowPress,
            this.handleRowSelect
        );
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
        const style = getStyleFromTheme(this.props.theme);
        let noResults = false;
        if (typeof this.props.data === 'object') {
            noResults = Object.keys(this.props.data).length === 0;
        } else {
            noResults = this.props.data.length === 0;
        }

        if (this.props.showNoResults && !this.props.loading && noResults) {
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
            <ListView
                style={style.listView}
                dataSource={this.state.dataSource}
                renderRow={this.renderRow}
                renderSectionHeader={this.props.showSections ? this.renderSectionHeader : null}
                renderSeparator={this.renderSeparator}
                renderFooter={this.renderFooter}
                enableEmptySections={true}
                onEndReached={this.props.onListEndReached}
                onEndReachedThreshold={this.props.onListEndReachedThreshold}
                pageSize={this.props.listPageSize}
                initialListSize={this.props.listInitialSize}
                scrollRenderAheadDistance={this.props.listScrollRenderAheadDistance}
            />
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            ...Platform.select({
                android: {
                    marginBottom: 20
                }
            })
        },
        loadingText: {
            color: changeOpacity(theme.centerChannelColor, 0.6)
        },
        sectionContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.07),
            paddingLeft: 10,
            paddingVertical: 2
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg
        },
        sectionText: {
            fontWeight: '600',
            color: theme.centerChannelColor
        },
        separator: {
            height: 1,
            flex: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1)
        },
        noResultContainer: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
        },
        noResultText: {
            fontSize: 26,
            color: changeOpacity(theme.centerChannelColor, 0.5)
        }
    });
});
