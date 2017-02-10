// Copyright (c) 2017 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component, PropTypes} from 'react';
import {
    ListView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

import FormattedText from 'app/components/formatted_text';
import ProfilePicture from 'app/components/profile_picture';

import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

const AT_MENTION_REGEX = /\B\@\w+$|\B\@$/i; // eslint-disable-line

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        section: {
            justifyContent: 'center',
            paddingLeft: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        sectionText: {
            fontSize: 12,
            color: changeOpacity(theme.centerChannelColor, 0.7),
            paddingVertical: 7
        },
        sectionWrapper: {
            backgroundColor: theme.centerChannelBg
        },
        listView: {
            flex: 1,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderTopWidth: 0,
            borderBottomWidth: 0
        },
        loading: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 20,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 0
        },
        row: {
            height: 35,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        rowIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.7),
            fontSize: 14
        },
        rowPicture: {
            marginHorizontal: 8,
            width: 20,
            alignItems: 'center',
            justifyContent: 'center'
        },
        rowUsername: {
            fontSize: 13,
            color: theme.centerChannelColor
        },
        rowFullname: {
            color: theme.centerChannelColor,
            opacity: 0.6
        }
    });
});

export default class AtMention extends Component {
    static propTypes = {
        currentChannelId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        autocompleteUsersInCurrentChannel: PropTypes.object.isRequired,
        postDraft: PropTypes.string,
        requestStatus: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        actions: PropTypes.shape({
            changePostDraft: PropTypes.func.isRequired,
            autocompleteUsersInChannel: PropTypes.func.isRequired
        })
    }

    static defaultProps = {
        autocompleteUsersInCurrentChannel: {},
        postDraft: '',
        onListEndReached: () => true,
        onListEndThreshold: 50,
        listPageSize: 10,
        listInitialSize: 10,
        listScrollRenderAheadDistance: 200
    }

    constructor(props) {
        super(props);

        const ds = new ListView.DataSource({
            sectionHeaderHasChanged: (s1, s2) => s1 !== s2,
            rowHasChanged: (r1, r2) => r1 !== r2
        });
        const data = {
            'Channel Members': [],
            'Not in channel': []
        };
        this.state = {
            active: false,
            dataSource: ds.cloneWithRowsAndSections(data)
        };
    }

    componentWillReceiveProps(nextProps) {
        const match = nextProps.postDraft.match(AT_MENTION_REGEX);

        if (!match) {
            this.setState({
                active: false,
                matchTerm: null
            });
            return;
        }

        const matchTerm = match[0].substring(1);

        if (matchTerm !== this.state.matchTerm) {
            this.setState({
                matchTerm
            });

            const {currentTeamId, currentChannelId} = this.props;
            this.props.actions.autocompleteUsersInChannel(currentTeamId, currentChannelId, matchTerm);
        }

        if (this.props.requestStatus !== 'started') {
            const membersInChannel = nextProps.autocompleteUsersInCurrentChannel.in_channel || [];
            const membersOutOfChannel = nextProps.autocompleteUsersInCurrentChannel.out_of_channel || [];
            const data = {
                'Channel Members': membersInChannel,
                'Not in channel': membersOutOfChannel
            };
            this.setState({
                active: true,
                dataSource: this.state.dataSource.cloneWithRowsAndSections(data)
            });
        }
    }

    completeMention = (mention) => {
        const newPostDraft = this.props.postDraft.replace(AT_MENTION_REGEX, `@${mention} `);
        this.props.actions.changePostDraft(newPostDraft);
    }

    renderSectionHeader = (sectionData, sectionId) => {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <View style={style.sectionWrapper}>
                <View style={style.section}>
                    <Text style={style.sectionText}>{sectionId}</Text>
                </View>
            </View>
        );
    }

    renderRow = (data) => {
        const style = getStyleFromTheme(this.props.theme);
        const hasFullName = data.first_name.length > 0 && data.last_name.length > 0;

        return (
            <TouchableOpacity
                onPress={() => this.completeMention(data.username)}
                style={style.row}
            >
                <View style={style.rowPicture}>
                    <ProfilePicture
                        user={data}
                        theme={this.props.theme}
                        size={20}
                        status={null}
                    />
                </View>
                <Text style={style.rowUsername}>{`@${data.username}`}</Text>
                {hasFullName && <Text style={style.rowUsername}>{' - '}</Text>}
                {hasFullName && <Text style={style.rowFullname}>{`${data.first_name} ${data.last_name}`}</Text>}
            </TouchableOpacity>
        );
    }

    renderFooter = () => {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <View>
                <View style={style.section}>
                    <FormattedText
                        id='suggestion.mention.special'
                        defaultMessage='Special Mentions'
                        style={style.sectionText}
                    />
                </View>
                <TouchableOpacity
                    onPress={() => this.completeMention('all')}
                    style={style.row}
                >
                    <View style={style.rowPicture}>
                        <Icon
                            name='users'
                            style={style.rowIcon}
                        />
                    </View>
                    <Text style={style.rowUsername}>{'@all'}</Text>
                    <Text style={style.rowUsername}>{' - '}</Text>
                    <FormattedText
                        id='suggestion.mention.channel'
                        defaultMessage='Notifies everyone in the channel'
                        style={style.rowFullname}
                    />
                </TouchableOpacity>
            </View>
        );
    }

    render() {
        if (!this.state.active) {
            return null;
        }

        const style = getStyleFromTheme(this.props.theme);
        const {autocompleteUsersInCurrentChannel, requestStatus} = this.props;
        if (
            (!autocompleteUsersInCurrentChannel.in_channel || !autocompleteUsersInCurrentChannel.in_channel.length) &&
            (!autocompleteUsersInCurrentChannel.out_of_channel || !autocompleteUsersInCurrentChannel.out_of_channel.length) &&
            requestStatus === 'not_started'
        ) {
            return (
                <View style={style.loading}>
                    <FormattedText
                        id='analytics.chart.loading": "Loading...'
                        defaultMessage='Loading...'
                        style={style.sectionText}
                    />
                </View>
            );
        }

        return (
            <ListView
                keyboardShouldPersistTaps='always'
                style={style.listView}
                enableEmptySections={true}
                dataSource={this.state.dataSource}
                renderSectionHeader={this.renderSectionHeader}
                renderRow={this.renderRow}
                renderFooter={this.renderFooter}
                pageSize={10}
                initialListSize={10}
            />
        );
    }
}
