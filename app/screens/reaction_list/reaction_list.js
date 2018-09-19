// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {View} from 'react-native';
import {intlShape} from 'react-intl';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';

import {changeOpacity, makeStyleSheetFromTheme} from 'app/utils/theme';
import {
    generateUserProfilesById,
    getMissingUserIds,
    getReactionsByName,
    getSortedReactionsForHeader,
    sortReactions,
} from 'app/utils/reaction';

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

        this.userProfilesById = generateUserProfilesById(userProfiles);
        this.getMissingProfiles(allUserIds, userProfiles);

        const reactionsByName = getReactionsByName(reactions);

        this.state = {
            selected: ALL_EMOJIS,
            reactions,
            reactionsByName,
            sortedReactions: sortReactions(reactionsByName),
            sortedReactionsForHeader: getSortedReactionsForHeader(reactionsByName),
        };

        props.navigator.setOnNavigatorEvent(this.onNavigatorEvent);
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (!nextProps.reactions.length !== prevState.reactions.length) {
            const {reactions} = nextProps;

            const reactionsByName = getReactionsByName(reactions);

            return {
                reactions,
                reactionsByName,
                sortedReactions: sortReactions(reactionsByName),
                sortedReactionsForHeader: getSortedReactionsForHeader(reactionsByName),
            };
        }

        return null;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.userProfiles.length !== this.props.userProfiles.length) {
            this.userProfilesById = generateUserProfilesById(this.props.userProfiles);
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
            const missingUserIds = getMissingUserIds(this.userProfilesById, allUserIds);

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

    renderReactionRows = () => {
        const {
            navigator,
            teammateNameDisplay,
            theme,
        } = this.props;
        const {
            reactionsByName,
            selected,
            sortedReactions,
        } = this.state;
        const style = getStyleSheet(theme);
        const reactions = selected === ALL_EMOJIS ? sortedReactions : reactionsByName[selected];

        return reactions.map(({emoji_name: emojiName, user_id: userId}) => (
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
                <View style={style.separator}/>
            </View>
        ));
    }

    render() {
        const {
            theme,
        } = this.props;
        const {
            selected,
            sortedReactionsForHeader,
        } = this.state;
        const style = getStyleSheet(theme);

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
                    {this.renderReactionRows()}
                </KeyboardAwareScrollView>
            </View>
        );
    }
}

const getStyleSheet = makeStyleSheetFromTheme((theme) => {
    return {
        flex: {
            backgroundColor: theme.centerChannelBg,
            flex: 1,
        },
        headerContainer: {
            height: 38,
            borderColor: changeOpacity(theme.centerChannelColor, 0.2),
            borderBottomWidth: 1,
        },
        rowContainer: {
            justifyContent: 'center',
            height: 45,
        },
        separator: {
            height: 1,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.2),
        },
    };
});
