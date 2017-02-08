// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    ListView,
    StyleSheet,
    Text,
    View
} from 'react-native';

import {displayUsername} from 'service/utils/user_utils';

import FormattedText from 'app/components/formatted_text';

import MemberListRow from './member_list_row';

const style = StyleSheet.create({
    listView: {
        flex: 1
    },
    loadingText: {
        opacity: 0.6
    },
    sectionContainer: {
        backgroundColor: '#eaeaea',
        paddingLeft: 10,
        paddingVertical: 2
    },
    sectionText: {
        fontWeight: '600'
    },
    separator: {
        height: 1,
        flex: 1,
        backgroundColor: '#eaeaea'
    }
});

export default class MemberList extends PureComponent {
    static propTypes = {
        members: PropTypes.array.isRequired,
        onRowPress: PropTypes.func,
        onListEndReached: PropTypes.func,
        onListEndReachedThreshold: PropTypes.number,
        preferences: PropTypes.object,
        loadingMembers: PropTypes.bool,
        listPageSize: PropTypes.number,
        listInitialSize: PropTypes.number,
        listScrollRenderAheadDistance: PropTypes.number,
        showSections: PropTypes.bool,
        selectable: PropTypes.bool,
        onRowSelect: PropTypes.func,
        renderRow: PropTypes.func
    }

    static defaultProps = {
        onListEndReached: () => true,
        onListEndThreshold: 50,
        listPageSize: 10,
        listInitialSize: 10,
        listScrollRenderAheadDistance: 200,
        selectable: false,
        onRowSelect: () => true,
        showSections: true
    }

    constructor(props) {
        super(props);

        const ds = new ListView.DataSource({
            rowHasChanged: (r1, r2) => r1 !== r2,
            sectionHeaderHasChanged: (s1, s2) => s1 !== s2
        });
        let data = props.members;
        if (props.showSections) {
            data = this.createSections(props.members);
        }
        const dataSource = ds.cloneWithRowsAndSections(data);
        this.state = {
            data,
            dataSource
        };
    }

    componentWillReceiveProps(nextProps) {
        const {members, showSections} = nextProps;

        if (members !== this.props.members || showSections !== this.props.showSections) {
            let data = members;
            if (showSections) {
                data = this.createSections(members);
            }

            const mergedData = Object.assign({}, data, this.state.data);
            const dataSource = showSections ? this.state.dataSource.cloneWithRowsAndSections(mergedData) : this.state.dataSource.cloneWithRows(mergedData);
            this.setState({
                data: mergedData,
                dataSource
            });
        }
    }

    createSections = (data) => {
        const sections = {};
        data.forEach((d) => {
            const name = d.username;
            const sectionKey = name.substring(0, 1).toUpperCase();

            if (!sections[sectionKey]) {
                sections[sectionKey] = [];
            }

            sections[sectionKey].push(d);
        });

        return sections;
    }

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
    }

    renderSectionHeader = (sectionData, sectionId) => {
        return (
            <View style={style.sectionContainer}>
                <Text style={style.sectionText}>{sectionId}</Text>
            </View>
        );
    }

    renderRow = (user, sectionId, rowId) => {
        const {id, username} = user;
        const displayName = displayUsername(user, this.props.preferences);
        let onRowSelect = null;
        if (this.props.selectable) {
            onRowSelect = () => this.handleRowSelect(sectionId, rowId);
        }

        return (
            <MemberListRow
                id={id}
                user={user}
                displayName={displayName}
                username={username}
                onPress={this.props.onRowPress}
                selectable={this.props.selectable}
                selected={user.selected}
                onRowSelect={onRowSelect}
            />
        );
    }

    renderSeparator = (sectionId, rowId) => {
        return (
            <View
                key={`${sectionId}-${rowId}`}
                style={style.separator}
            />
        );
    }

    renderFooter = () => {
        if (!this.props.loadingMembers) {
            return null;
        }

        const backgroundColor = this.props.members.length > 0 ? '#fff' : '#0000';

        return (
            <View style={{height: 70, backgroundColor, alignItems: 'center', justifyContent: 'center'}}>
                <FormattedText
                    id='mobile.components.member_list.loading_members'
                    defaultMessage='Loading Members...'
                    style={style.loadingText}
                />
            </View>
        );
    }

    render() {
        const renderRow = this.props.renderRow || this.renderRow;

        return (
            <ListView
                style={style.listView}
                dataSource={this.state.dataSource}
                renderRow={renderRow}
                renderSectionHeader={this.renderSectionHeader}
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
