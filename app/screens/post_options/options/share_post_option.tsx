// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useAnimatedStyle, withTiming } from "react-native-reanimated";
import Share from "react-native-share";

import { updateLocalFilePath } from "@actions/local/file";
import { downloadFile } from "@actions/remote/file";
import { BaseOption } from "@components/common_post_options";
import CompassIcon from "@components/compass_icon";
import ProgressBar from "@components/progress_bar";
import Toast from "@components/toast";
import { useServerUrl } from "@context/server";
import { queryFilesForPost } from "@queries/servers/file";
import { getLocalFilePathFromFile } from "@utils/file";
import { pathWithPrefix } from "@utils/files";
import { logDebug } from "@utils/log";
import { getFullErrorMessage } from "@utils/errors";
import { t } from "@i18n";
import { typography } from "@utils/typography";

import type PostModel from "@typings/database/models/servers/post";
import type { AvailableScreens } from "@typings/screens/navigation";
import type {
    ClientResponse,
    ProgressPromise,
} from "@mattermost/react-native-network-client";

type Props = {
    bottomSheetId: AvailableScreens;
    post: PostModel;
    sourceScreen: AvailableScreens;
};

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        flex: 1,
        flexDirection: "row",
        gap: 4,
    },
    toast: {
        backgroundColor: "#3F4350",
    },
    option: {
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        marginTop: 8,
    },
    progress: {
        width: "85%",
    },
    title: {
        color: "#FFF",
        ...typography("Body", 75, "SemiBold"),
    },
});

const SharePostOption = ({ post }: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [showToast, setShowToast] = useState(false);
    const [progress, setProgress] = useState(0);
    const mounted = useRef(false);
    const downloadPromise = useRef<ProgressPromise<ClientResponse>>();

    const animatedStyle = useAnimatedStyle(() => {
        return {
            position: "absolute",
            bottom: 60,
            opacity: withTiming(showToast ? 1 : 0, { duration: 300 }),
        };
    });

    const cancel = async () => {
        try {
            downloadPromise.current?.cancel?.();
            downloadPromise.current = undefined;
        } catch {
        } finally {
            if (mounted.current) {
                setShowToast(false);
            }
        }
    };

    const handleShare = useCallback(async () => {
        try {
            const files = await queryFilesForPost(
                post.database,
                post.id,
            ).fetch();
            
            if (!files.length) {
                await Share.open({
                    message: post.message || "",
                    title: "",
                });
                return;
            }

            setShowToast(true);
            const filePaths: string[] = [];
            for (const file of files) {
                const fileInfo = file.toFileInfo(post.userId);
                const path = getLocalFilePathFromFile(serverUrl, fileInfo);
                if (!path) {
                    continue;
                }

                downloadPromise.current = downloadFile(
                    serverUrl,
                    fileInfo.id!,
                    path,
                );
                downloadPromise.current?.progress?.(setProgress);

                const response = await downloadPromise.current;
                if (response.data?.path) {
                    const filePath = response.data.path as string;
                    updateLocalFilePath(serverUrl, fileInfo.id!, filePath);
                    filePaths.push(pathWithPrefix("file://", filePath));
                }
            }

            if (filePaths.length > 0) {
                await Share.open({
                    message: post.message || "",
                    title: "",
                    urls: filePaths,
                    showAppsToView: true,
                });
            }
            setShowToast(false);
        } catch (error) {
            logDebug("error on share post", getFullErrorMessage(error));
            setShowToast(false);
        }
    }, [post, serverUrl]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    return (
        <>
            <BaseOption
                i18nId={t("post_info.share")}
                defaultMessage="Share"
                iconName="share-variant-outline"
                onPress={handleShare}
                testID="post_options.share_post.option"
            />
            {showToast && (
                <Toast
                    animatedStyle={animatedStyle}
                    style={styles.toast}
                    message={intl.formatMessage({
                        id: "gallery.preparing",
                        defaultMessage: "Preparing...",
                    })}
                >
                    <View style={styles.container}>
                        <View style={styles.progress} pointerEvents="none">
                            <ProgressBar
                                color="#fff"
                                progress={progress}
                                style={{ marginTop: 5 }}
                            />
                        </View>
                        <View style={styles.option}>
                            <TouchableOpacity onPress={cancel}>
                                <CompassIcon
                                    color="#FFF"
                                    name="close"
                                    size={24}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Toast>
            )}
        </>
    );
};

export default SharePostOption; 