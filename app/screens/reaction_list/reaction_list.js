// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import {intlShape} from 'react-intl';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';

import ReactionHeader from './reaction_header';
import ReactionRow from './reaction_row';

import {ALL_EMOJIS} from 'app/constants/emoji';

export default class ReactionList extends PureComponent {
    static propTypes = {
        actions: PropTypes.shape({
            getMissingProfilesByIds: PropTypes.func.isRequired,
        }).isRequired,
        allUserIds: PropTypes.array,
        navigator: PropTypes.object,
        reactions: PropTypes.array.isRequired,
        theme: PropTypes.object.isRequired,
        teammateNameDisplay: PropTypes.string,
        userProfiles: PropTypes.array,
    };

    static contextTypes = {
        intl: intlShape.isRequired,
    };

    constructor(props) {
        super(props);
        const {allUserIds, reactions, userProfiles} = props;

        this.userProfilesById = ReactionList.generateUserProfilesById(userProfiles);
        this.getMissingProfiles(allUserIds, userProfiles);

        const reactionsByName = ReactionList.getReactionsByName(reactions);

        this.state = {
            selected: ALL_EMOJIS,
            reactions,
            reactionsByName,
            sortedReactions: ReactionList.sortReactions(reactionsByName),
            sortedReactionsForHeader: ReactionList.getSortedReactionsForHeader(reactionsByName),
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (!nextProps.reactions.length !== prevState.reactions.length) {
            const {reactions} = nextProps;

            const reactionsByName = ReactionList.getReactionsByName(reactions);

            return {
                reactions,
                reactionsByName,
                sortedReactions: ReactionList.sortReactions(reactionsByName),
                sortedReactionsForHeader: ReactionList.getSortedReactionsForHeader(reactionsByName),
            };
        }

        return null;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.userProfiles.length !== this.props.userProfiles.length) {
            this.userProfilesById = ReactionList.generateUserProfilesById(this.props.userProfiles);
        }

        if (prevProps.allUserIds.length !== this.props.allUserIds.length) {
            this.getMissingProfiles(this.props.allUserIds, this.props.userProfiles);
        }
    }

    onNavigatorEvent = (event) => {
        if (event.type === 'NavBarButtonPress') {
            if (event.id === 'close-reaction-list') {
                this.props.navigator.dismissModal({
                    animationType: 'slide-down',
                });
            }
        }
    };

    getMissingProfiles = (allUserIds, userProfiles) => {
        if (userProfiles.length !== allUserIds.length) {
            const missingUserIds = ReactionList.getMissingUserIds(this.userProfilesById, allUserIds);

            if (missingUserIds.length > 0) {
                this.props.actions.getMissingProfilesByIds(missingUserIds);
            }
        }
    }

    scrollViewRef = (ref) => {
        this.scrollView = ref;
    };

    handleOnSelectReaction = (emoji) => {
        this.setState({selected: emoji});
    }

    render() {
        const {
            navigator,
            teammateNameDisplay,
            theme,
        } = this.props;
        const {
            reactionsByName,
            selected,
            sortedReactions,
            sortedReactionsForHeader,
        } = this.state;

        const style = getStyleSheet(theme);
        const reactions = selected === ALL_EMOJIS ? sortedReactions : reactionsByName[selected];

        return (
            <View style={style.flex}>
                <View style={style.headerContainer}>
                    <ReactionHeader
                        selected={selected}
                        onSelectReaction={this.handleOnSelectReaction}
                        reactions={sortedReactionsForHeader}
                        theme={theme}
                    />
                </View>
                <KeyboardAwareScrollView
                    bounces={true}
                    innerRef={this.scrollViewRef}
                >
                    {reactions.map(({emoji_name: emojiName, user_id: userId}) => (
                        <View
                            key={emojiName + userId}
                            style={style.rowContainer}
                        >
                            <ReactionRow
                                emojiName={emojiName}
                                navigator={navigator}
                                teammateNameDisplay={teammateNameDisplay}
                                theme={theme}
                                user={this.userProfilesById[userId]}
                            />
                        </View>
                    ))}
                </KeyboardAwareScrollView>
            </View>
        );
    }

    static generateUserProfilesById = (userProfiles = []) => {
        return userProfiles.reduce((acc, userProfile) => {
            acc[userProfile.id] = userProfile;

            return acc;
        }, []);
    }

    static getMissingUserIds = (userProfilesById = {}, allUserIds = []) => {
        return allUserIds.reduce((acc, userId) => {
            if (userProfilesById[userId]) {
                acc.push(userId);
            }

            return acc;
        }, []);
    }

    static compareReactions(a, b) {
        if (a.count !== b.count) {
            return b.count - a.count;
        }

        return a.name.localeCompare(b.name);
    }

    static getReactionsByName(reactions = []) {
        return reactions.reduce((acc, reaction) => {
            const byName = acc[reaction.emoji_name] || [];
            acc[reaction.emoji_name] = [...byName, reaction];

            return acc;
        }, {});
    }

    static sortReactionsByName(reactionsByName = {}) {
        return Object.entries(reactionsByName).
            map(([name, reactions]) => ({name, reactions, count: reactions.length})).
            sort(ReactionList.compareReactions);
    }

    static sortReactions(reactionsByName = {}) {
        return ReactionList.sortReactionsByName(reactionsByName).
            reduce((acc, {reactions}) => {
                reactions.forEach((r) => acc.push(r));
                return acc;
            }, []);
    }

    static getSortedReactionsForHeader(reactionsByName = {}) {
        const sortedReactionsForHeader = ReactionList.sortReactionsByName(reactionsByName);

        const totalCount = sortedReactionsForHeader.reduce((acc, reaction) => {
            return acc + reaction.count;
        }, 0);

        return [{name: ALL_EMOJIS, count: totalCount}, ...sortedReactionsForHeader];
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        headerContainer: {
            height: 51,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
        },
        rowContainer: {
            alignItems: 'center',
            width: '100%',
            height: 66,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
        },
        separator: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
            height: 1,
        },
    };
});
