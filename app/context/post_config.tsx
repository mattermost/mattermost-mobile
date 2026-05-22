// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {createContext, useContext, useMemo} from 'react';
import {map} from 'rxjs/operators';

import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {observeIsPostPriorityEnabled} from '@queries/servers/post';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';
import {observeConfigBooleanValue, observeConfigIntValue, observeIfHighlightWithoutNotificationHasLicense} from '@queries/servers/system';
import {observeTeammateNameDisplay} from '@queries/servers/user';

import type {WithDatabaseArgs} from '@typings/database/database';

export interface PostConfig {

    // System config
    enablePostUsernameOverride: boolean;
    isCustomStatusEnabled: boolean;
    hideGuestTags: boolean;
    enableLatex: boolean;
    enableInlineLatex: boolean;
    publicLinkEnabled: boolean;
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
    maxMarkdownNodes: number;
    minimumHashtagLength: number;
    isHighlightWithoutNotificationLicensed: boolean;
    isPostPriorityEnabled: boolean;

    // User preferences
    isMilitaryTime: boolean;
    teammateNameDisplay: string;
}

const PostConfigContext = createContext<PostConfig>({
    enablePostUsernameOverride: false,
    isCustomStatusEnabled: false,
    hideGuestTags: false,
    enableLatex: false,
    enableInlineLatex: false,
    publicLinkEnabled: false,
    canDownloadFiles: true,
    enableSecureFilePreview: false,
    maxMarkdownNodes: 16000,
    minimumHashtagLength: 3,
    isHighlightWithoutNotificationLicensed: false,
    isPostPriorityEnabled: false,
    isMilitaryTime: false,
    teammateNameDisplay: '',
});

export const usePostConfig = () => useContext(PostConfigContext);

const enhance = withObservables([], ({database}: WithDatabaseArgs) => ({

    // System config
    enablePostUsernameOverride: observeConfigBooleanValue(database, 'EnablePostUsernameOverride'),
    isCustomStatusEnabled: observeConfigBooleanValue(database, 'EnableCustomUserStatuses'),
    hideGuestTags: observeConfigBooleanValue(database, 'HideGuestTags'),
    enableLatex: observeConfigBooleanValue(database, 'EnableLatex'),
    enableInlineLatex: observeConfigBooleanValue(database, 'EnableInlineLatex'),
    publicLinkEnabled: observeConfigBooleanValue(database, 'EnablePublicLink'),
    canDownloadFiles: observeCanDownloadFiles(database),
    enableSecureFilePreview: observeEnableSecureFilePreview(database),
    maxMarkdownNodes: observeConfigIntValue(database, 'MaxMarkdownNodes'),
    minimumHashtagLength: observeConfigIntValue(database, 'MinimumHashtagLength'),
    isHighlightWithoutNotificationLicensed: observeIfHighlightWithoutNotificationHasLicense(database),
    isPostPriorityEnabled: observeIsPostPriorityEnabled(database),

    // User preferences
    isMilitaryTime: queryDisplayNamePreferences(database).
        observeWithColumns(['value']).pipe(
            map((prefs) => getDisplayNamePreferenceAsBool(prefs, 'use_military_time')),
        ),
    teammateNameDisplay: observeTeammateNameDisplay(database),
}));

const PostConfigProviderBase: React.FC<PostConfig & {children: React.ReactNode}> = ({
    enablePostUsernameOverride,
    isCustomStatusEnabled,
    hideGuestTags,
    enableLatex,
    enableInlineLatex,
    publicLinkEnabled,
    canDownloadFiles,
    enableSecureFilePreview,
    maxMarkdownNodes,
    minimumHashtagLength,
    isHighlightWithoutNotificationLicensed,
    isPostPriorityEnabled,
    isMilitaryTime,
    teammateNameDisplay,
    children,
}) => {
    // Memoize the context value to prevent unnecessary re-renders of consumers
    const value = useMemo(() => ({
        enablePostUsernameOverride,
        isCustomStatusEnabled,
        hideGuestTags,
        enableLatex,
        enableInlineLatex,
        publicLinkEnabled,
        canDownloadFiles,
        enableSecureFilePreview,
        maxMarkdownNodes,
        minimumHashtagLength,
        isHighlightWithoutNotificationLicensed,
        isPostPriorityEnabled,
        isMilitaryTime,
        teammateNameDisplay,
    }), [
        enablePostUsernameOverride,
        isCustomStatusEnabled,
        hideGuestTags,
        enableLatex,
        enableInlineLatex,
        publicLinkEnabled,
        canDownloadFiles,
        enableSecureFilePreview,
        maxMarkdownNodes,
        minimumHashtagLength,
        isHighlightWithoutNotificationLicensed,
        isPostPriorityEnabled,
        isMilitaryTime,
        teammateNameDisplay,
    ]);

    return (
        <PostConfigContext.Provider value={value}>
            {children}
        </PostConfigContext.Provider>
    );
};

export const PostConfigProvider = withDatabase(enhance(PostConfigProviderBase));
