// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useCallback } from "react";

import { BaseOption } from "@components/common_post_options";
import { useServerUrl } from "@context/server";
import { t } from "@i18n";
import {
    dismissAllModalsAndPopToRoot,
    findChannels,
} from "@screens/navigation";

import type PostModel from "@typings/database/models/servers/post";
import type { AvailableScreens } from "@typings/screens/navigation";
import { addFilesToDraft, updateDraftMessage } from "@actions/local/draft";
import { useTheme } from "@context/theme";
import { useIntl } from "react-intl";
import type { ChannelModel } from "@database/models/server";
import DraftUploadManager from "@managers/draft_upload_manager";

type Props = {
    post: PostModel;
    bottomSheetId: AvailableScreens;
};

const ForwardOption = ({ post, bottomSheetId }: Props) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();

    const handleForward = useCallback(async () => {
        const postFiles = await post.files;
        const filesInfo = postFiles.map((file, idx) => file.toFileInfo(`file-${idx}`));

        await dismissAllModalsAndPopToRoot();
        await findChannels(
            intl.formatMessage({
                id: "find_channels.title.select",
                defaultMessage: "Select channel to forward message",
            }),
            theme,
            {
                onPress: async (c: Channel | ChannelModel) => {
                    const nickname = (await post.author).username;
                    await addFilesToDraft(serverUrl, c.id, "", filesInfo);

                    for (const file of filesInfo) {
                        DraftUploadManager.prepareUpload(
                            serverUrl,
                            file,
                            c.id,
                            "",
                        );
                    }

                    await updateDraftMessage(
                        serverUrl,
                        c.id,
                        "",
                        `Forwarded from @${nickname}\n\n> ${post.message.replace(/^\s*[\r\n]/gm, "")} \n\n`,
                    );
                },
            },
        );
    }, [bottomSheetId, post, serverUrl]);

    return (
        <BaseOption
            i18nId={t("mobile.post_info.forward")}
            defaultMessage="Forward message"
            iconName="send"
            onPress={handleForward}
            testID="post_options.forward_post.option"
        />
    );
};

export default ForwardOption;
