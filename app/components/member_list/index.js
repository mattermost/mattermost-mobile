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
        sections: PropTypes.bool,
        preferences: PropTypes.object,
        loadingMembers: PropTypes.bool,
        listPageSize: PropTypes.number,
        listInitialSize: PropTypes.number,
        listScrollRenderAheadDistance: PropTypes.number
    }

    static defaultProps = {
        onListEndReached: () => true,
        onListEndThreshold: 50,
        sections: true,
        listPageSize: 10,
        listInitialSize: 10,
        listScrollRenderAheadDistance: 200
    }

    constructor(props) {
        super(props);

        const ds = new ListView.DataSource({
            rowHasChanged: (r1, r2) => r1 !== r2,
            sectionHeaderHasChanged: (s1, s2) => s1 !== s2
        });
        const dataSource = props.sections ? ds.cloneWithRowsAndSections(this.createSections(props.members)) : ds.cloneWithRows(props.members);
        this.state = {
            dataSource
        };
    }

    componentWillReceiveProps(nextProps) {
        const {members, sections} = nextProps;
        const dataSource = sections ? this.state.dataSource.cloneWithRowsAndSections(this.createSections(members)) : this.state.dataSource.cloneWithRows(members);
        this.setState({
            dataSource
        });
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

    renderSectionHeader = (sectionData, sectionId) => {
        if (!this.props.sections) {
            return null;
        }

        return (
            <View style={style.sectionContainer}>
                <Text style={style.sectionText}>{sectionId}</Text>
            </View>
        );
    }

    renderRow = (user) => {
        const {id, username} = user;
        const displayName = displayUsername(user, this.props.preferences);

        return (
            <MemberListRow
                id={id}
                user={user}
                displayName={displayName}
                username={username}
                onPress={this.props.onRowPress}
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
        return (
            <ListView
                style={style.listView}
                dataSource={this.state.dataSource}
                renderRow={this.renderRow}
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
