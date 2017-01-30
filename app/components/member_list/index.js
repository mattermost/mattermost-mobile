// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {PropTypes, PureComponent} from 'react';
import {
    ListView,
    StyleSheet,
    Text,
    View
} from 'react-native';

import Client from 'service/client';
import {displayUsername} from 'service/utils/user_utils';

import MemberListRow from './member_list_row';

const style = StyleSheet.create({
    listView: {
        flex: 1
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
        preferences: PropTypes.object
    }

    static defaultProps = {
        onListEndReached: () => true,
        onListEndThreshold: 10,
        sections: true
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
            const name = displayUsername(d, this.props.preferences);
            const sectionKey = name.substring(0, 1).toUpperCase();

            if (!sections[sectionKey]) {
                sections[sectionKey] = [];
            }

            sections[sectionKey].push(d);
        });

        return sections;
    }

    renderSectionHeader = (sectionData, sectionId) => {
        return (
            <View style={style.sectionContainer}>
                <Text style={style.sectionText}>{sectionId}</Text>
            </View>
        );
    }

    renderRow = (data) => {
        const {id, username, status} = data;
        const displayName = displayUsername(data, this.props.preferences);
        const pictureURL = Client.getProfilePictureUrl(data.id);

        return (
            <MemberListRow
                id={id}
                pictureURL={pictureURL}
                displayName={displayName}
                username={username}
                status={status}
                onPress={this.props.onRowPress}
            />
        );
    }

    renderSeparator(sectionId, rowId) {
        return (
            <View
                key={`${sectionId}-${rowId}`}
                style={style.separator}
            />
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
                enableEmptySections={true}
                onEndReached={this.props.onListEndReached}
                onEndReachedThreshold={this.props.onListEndReachedThreshold}
            />
        );
    }
}
