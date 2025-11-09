// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import UserItem from '@components/user_item';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplay, getCurrentUser} from '@queries/servers/user';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type AtMentionItemProps = {
    user: UserProfile | UserModel;
    onPress?: (mention: string) => void;
    testID?: string;
}

const AtMentionItem = ({
    user,
    onPress,
    testID,
}: AtMentionItemProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();

    const completeMention = useCallback((u: UserModel | UserProfile) => {
        // ============================================================================
        // FEATURE: Display Name to Username Conversion for Mentions
        // ============================================================================
        // This function was modified to insert display names (e.g., "@John Doe")
        // instead of usernames (e.g., "@john.doe") into the text field when users
        // select mentions from the autocomplete dropdown.
        //
        // WHY: Users prefer seeing full names in the text field for better readability,
        //      especially when "Teammate Name Display" is set to "Show first and last name".
        //
        // HOW IT WORKS:
        // - Gets the teammate name display setting from the database
        // - Uses displayUsername() utility to get the display name based on user preferences
        // - The display name is inserted into the text field when user selects from autocomplete
        // - The conversion back to username happens in handle_send_message.ts before server submission
        //
        // RELATED CHANGES:
        // - This file: Modified to insert display names in text field
        // - handle_send_message.ts: Converts display names to usernames before server submission
        // ============================================================================
        (async () => {
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const teammateNameDisplay = await getTeammateNameDisplay(database);
                const currentUser = await getCurrentUser(database);
                const locale = currentUser?.locale || intl.locale;

                // Get display name instead of username
                const displayName = displayUsername(u, locale, teammateNameDisplay, false);

                // Only use display name if it's different from username and contains spaces (full name)
                // This ensures we only convert actual full names, not usernames that happen to match
                if (displayName !== u.username && displayName.includes(' ')) {
                    onPress?.(displayName);
                } else {
                    // Fallback to username if display name is same as username or doesn't have spaces
                    onPress?.(u.username);
                }
            } catch (error) {
                // Fallback to username on error
                onPress?.(u.username);
            }
        })();
    }, [serverUrl, intl, onPress]);

    return (
        <UserItem
            user={user}
            testID={testID}
            onUserPress={completeMention}
        />
    );
};

export default AtMentionItem;
