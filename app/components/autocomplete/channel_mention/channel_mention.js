// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
    ListView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

import FormattedText from 'app/components/formatted_text';
import {makeStyleSheetFromTheme, changeOpacity} from 'app/utils/theme';

import {RequestStatus} from 'mattermost-redux/constants';

const CHANNEL_MENTION_REGEX = /\B(~([^~\r\n]*))$/i;
const CHANNEL_SEARCH_REGEX = /\b(?:in|channel):\s*(\S*)$/i;

export default class ChannelMention extends Component {
    static propTypes = {
        currentChannelId: PropTypes.string.isRequired,
        currentTeamId: PropTypes.string.isRequired,
        cursorPosition: PropTypes.number.isRequired,
        autocompleteChannels: PropTypes.object.isRequired,
        postDraft: PropTypes.string,
        isSearch: PropTypes.bool,
        requestStatus: PropTypes.string.isRequired,
        theme: PropTypes.object.isRequired,
        onChangeText: PropTypes.func.isRequired,
        actions: PropTypes.shape({
            searchChannels: PropTypes.func.isRequired
        })
    };

    static defaultProps = {
        postDraft: '',
        isSearch: false
    };

    constructor(props) {
        super(props);

        const ds = new ListView.DataSource({
            sectionHeaderHasChanged: (s1, s2) => s1 !== s2,
            rowHasChanged: (r1, r2) => r1 !== r2
        });

        this.state = {
            active: false,
            dataSource: ds.cloneWithRowsAndSections(props.autocompleteChannels)
        };
    }

    componentWillReceiveProps(nextProps) {
        const {isSearch} = nextProps;
        const regex = isSearch ? CHANNEL_SEARCH_REGEX : CHANNEL_MENTION_REGEX;
        const match = nextProps.postDraft.substring(0, nextProps.cursorPosition).match(regex);

        // If not match or if user clicked on a channel
        if (!match || this.state.mentionComplete) {
            const nextState = {
                active: false,
                mentionComplete: false
            };

            // Handle the case where the user typed a ~ first and then backspaced
            if (nextProps.postDraft.length < this.props.postDraft.length) {
                nextState.matchTerm = null;
            }

            this.setState(nextState);
            return;
        }

        const matchTerm = isSearch ? match[1] : match[2];
        const myChannels = this.filter(nextProps.autocompleteChannels.myChannels, matchTerm);
        const otherChannels = this.filter(nextProps.autocompleteChannels.otherChannels, matchTerm);

        // Show loading indicator on first pull for channels
        if (nextProps.requestStatus === RequestStatus.STARTED && ((myChannels.length === 0 && otherChannels.length === 0) || matchTerm === '')) {
            this.setState({
                active: true,
                loading: true
            });
            return;
        }

        // Still matching the same term that didn't return any results
        let startsWith;
        if (isSearch) {
            startsWith = match[0].startsWith(`in:${this.state.matchTerm}`) || match[0].startsWith(`channel:${this.state.matchTerm}`);
        } else {
            startsWith = match[0].startsWith(`~${this.state.matchTerm}`);
        }

        if (startsWith && (myChannels.length === 0 && otherChannels.length === 0)) {
            this.setState({
                active: false
            });
            return;
        }

        if (matchTerm !== this.state.matchTerm) {
            this.setState({
                matchTerm
            });

            const {currentTeamId} = this.props;
            this.props.actions.searchChannels(currentTeamId, matchTerm);
            return;
        }

        if (nextProps.requestStatus !== RequestStatus.STARTED && this.props.autocompleteChannels !== nextProps.autocompleteChannels) {
            let data = {};
            if (myChannels.length > 0) {
                data = Object.assign({}, data, {myChannels});
            }
            if (otherChannels.length > 0) {
                data = Object.assign({}, data, {otherChannels});
            }

            this.setState({
                active: true,
                loading: false,
                dataSource: this.state.dataSource.cloneWithRowsAndSections(data)
            });
        }
    }

    filter = (channels, matchTerm) => {
        return channels.filter((c) => c.name.includes(matchTerm) || c.display_name.includes(matchTerm));
    };

    completeMention = (mention) => {
        const {cursorPosition, isSearch, onChangeText, postDraft} = this.props;
        const mentionPart = postDraft.substring(0, cursorPosition);

        let completedDraft;
        if (isSearch) {
            const channelOrIn = mentionPart.includes('in:') ? 'in:' : 'channel:';
            completedDraft = mentionPart.replace(CHANNEL_SEARCH_REGEX, `${channelOrIn} ${mention} `);
        } else {
            completedDraft = mentionPart.replace(CHANNEL_MENTION_REGEX, `~${mention} `);
        }

        if (postDraft.length > cursorPosition) {
            completedDraft += postDraft.substring(cursorPosition);
        }

        onChangeText(completedDraft);
        this.setState({
            active: false,
            mentionComplete: true,
            matchTerm: `${mention} `
        });
    };

    renderSectionHeader = (sectionData, sectionId) => {
        const style = getStyleFromTheme(this.props.theme);

        const localization = {
            myChannels: {
                id: 'suggestion.mention.channels',
                defaultMessage: 'My Channels'
            },
            otherChannels: {
                id: 'suggestion.mention.morechannels',
                defaultMessage: 'Other Channels'
            }
        };

        return (
            <View style={style.sectionWrapper}>
                <View style={style.section}>
                    <FormattedText
                        id={localization[sectionId].id}
                        defaultMessage={localization[sectionId].defaultMessage}
                        style={style.sectionText}
                    />
                </View>
            </View>
        );
    };

    renderRow = (data) => {
        const style = getStyleFromTheme(this.props.theme);

        return (
            <TouchableOpacity
                onPress={() => this.completeMention(data.name)}
                style={style.row}
            >
                <Text style={style.rowDisplayName}>{data.display_name}</Text>
                <Text style={style.rowName}>{` (~${data.name})`}</Text>
            </TouchableOpacity>
        );
    };

    render() {
        if (!this.state.active) {
            // If we are not in an active state return null so nothing is rendered
            // other components are not blocked.
            return null;
        }

        const {requestStatus, theme} = this.props;

        const style = getStyleFromTheme(theme);

        if (this.state.loading && requestStatus === RequestStatus.STARTED) {
            return (
                <View style={style.loading}>
                    <FormattedText
                        id='analytics.chart.loading'
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
                pageSize={10}
                initialListSize={10}
            />
        );
    }
}

const getStyleFromTheme = makeStyleSheetFromTheme((theme) => {
    return StyleSheet.create({
        section: {
            justifyContent: 'center',
            paddingLeft: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.1),
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2)
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
            backgroundColor: theme.centerChannelBg
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
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.centerChannelBg,
            borderTopWidth: 1,
            borderTopColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderLeftWidth: 1,
            borderLeftColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderRightWidth: 1,
            borderRightColor: changeOpacity(theme.centerChannelColor, 0.2)
        },
        rowDisplayName: {
            fontSize: 13,
            color: theme.centerChannelColor
        },
        rowName: {
            color: theme.centerChannelColor,
            opacity: 0.6
        }
    });
});
