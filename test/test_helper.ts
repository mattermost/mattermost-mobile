// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import assert from 'assert';

import {random} from 'lodash';
import nock from 'nock';
import {of as of$} from 'rxjs';

import Config from '@assets/config.json';
import {Client} from '@client/rest';
import {ActionType} from '@constants';
import {Ringtone} from '@constants/calls';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {prepareCommonSystemValues} from '@queries/servers/system';

import type {APIClientInterface} from '@mattermost/react-native-network-client';
import type {Model, Query, Relation} from '@nozbe/watermelondb';
import type PlaybookChecklistModel from '@playbooks/types/database/models/playbook_checklist';
import type PlaybookChecklistItemModel from '@playbooks/types/database/models/playbook_checklist_item';
import type PlaybookRunModel from '@playbooks/types/database/models/playbook_run';
import type CategoryChannelModel from '@typings/database/models/servers/category_channel';
import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelBookmarkModel from '@typings/database/models/servers/channel_bookmark';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type ChannelMembershipModel from '@typings/database/models/servers/channel_membership';
import type CustomProfileAttributeModel from '@typings/database/models/servers/custom_profile_attribute';
import type CustomProfileFieldModel from '@typings/database/models/servers/custom_profile_field';
import type DraftModel from '@typings/database/models/servers/draft';
import type FileModel from '@typings/database/models/servers/file';
import type GroupModel from '@typings/database/models/servers/group';
import type MyChannelModel from '@typings/database/models/servers/my_channel';
import type MyChannelSettingsModel from '@typings/database/models/servers/my_channel_settings';
import type MyTeamModel from '@typings/database/models/servers/my_team';
import type PostModel from '@typings/database/models/servers/post';
import type PostsInChannelModel from '@typings/database/models/servers/posts_in_channel';
import type PreferenceModel from '@typings/database/models/servers/preference';
import type RoleModel from '@typings/database/models/servers/role';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type TeamModel from '@typings/database/models/servers/team';
import type ThreadModel from '@typings/database/models/servers/thread';
import type UserModel from '@typings/database/models/servers/user';
import type {IntlShape} from 'react-intl';

const DEFAULT_LOCALE = 'en';

class TestHelperSingleton {
    basicClient: Client | null;
    basicUser: UserProfile | null;
    basicTeam: Team | null;
    basicTeamMember: TeamMembership | null;
    basicCategory: Category | null;
    basicCategoryChannel: CategoryChannel | null;
    basicChannel: Channel | null;
    basicChannelMember: ChannelMembership | null;
    basicMyChannel: ChannelMembership | null;
    basicMyChannelSettings: ChannelMembership | null;
    basicPost: Post | null;
    basicRoles: Record<string, Role> | null;

    constructor() {
        this.basicClient = null;

        this.basicUser = null;
        this.basicTeam = null;
        this.basicTeamMember = null;
        this.basicCategory = null;
        this.basicCategoryChannel = null;
        this.basicChannel = null;
        this.basicChannelMember = null;
        this.basicMyChannel = null;
        this.basicMyChannelSettings = null;
        this.basicPost = null;
        this.basicRoles = null;
    }

    setupServerDatabase = async (url?: string) => {
        const serverUrl = url || 'https://appv1.mattermost.com';
        await DatabaseManager.init([serverUrl]);
        const {database, operator} = DatabaseManager.serverDatabases[serverUrl]!;

        this.initMockEntities();

        // Add current user
        await operator.handleUsers({
            users: [this.basicUser!],
            prepareRecordsOnly: false,
        });

        // Add one team
        await operator.handleTeam({
            teams: [this.basicTeam!],
            prepareRecordsOnly: false,
        });
        await operator.handleMyTeam({
            myTeams: [{id: this.basicTeamMember!.id!, roles: this.basicTeamMember!.roles}],
            prepareRecordsOnly: false,
        });

        // Add a category and associated channel entities
        await operator.handleCategories({
            categories: [this.basicCategory!],
            prepareRecordsOnly: false,
        });
        await operator.handleCategoryChannels({
            categoryChannels: [this.basicCategoryChannel!],
            prepareRecordsOnly: false,
        });
        await operator.handleChannel({
            channels: [this.basicChannel!],
            prepareRecordsOnly: false,
        });
        await operator.handleMyChannel({
            prepareRecordsOnly: false,
            channels: [this.basicChannel!],
            myChannels: [this.basicMyChannel!],
        });
        await operator.handleMyChannelSettings({
            prepareRecordsOnly: false,
            settings: [this.basicMyChannelSettings!],
        });

        const systems = await prepareCommonSystemValues(operator, {
            license: {} as ClientLicense,
            currentChannelId: '',
            currentTeamId: this.basicTeam!.id,
            currentUserId: this.basicUser!.id,
        });
        if (systems?.length) {
            await operator.batchRecords(systems, 'test');
        }

        await operator.handleSystem({
            prepareRecordsOnly: false,
            systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: PUSH_PROXY_STATUS_VERIFIED}],
        });

        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_NEW,
            order: [this.basicPost!.id],
            posts: [this.basicPost!],
            prepareRecordsOnly: false,
        });

        return {database, operator};
    };

    activateMocking() {
        if (!nock.isActive()) {
            nock.activate();
        }
    }

    assertStatusOkay = (data: {status: string}) => {
        assert(data);
        assert(data.status === 'OK');
    };

    generateId = () => {
        // implementation taken from http://stackoverflow.com/a/2117523
        let id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
        id = id.replace(/[xy]/g, (c) => {
            const r = Math.floor(Math.random() * 16);
            let v;

            if (c === 'x') {
                v = r;
            } else {

                v = (r & 0x3) | 0x8;
            }

            return v.toString(16);
        });

        return id;
    };

    createClient = () => {
        const mockApiClient: APIClientInterface = {
            baseUrl: 'https://community.mattermost.com',
            delete: jest.fn(),
            head: jest.fn(),
            get: jest.fn(),
            patch: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            upload: jest.fn(),
            config: {
                headers: undefined,
                sessionConfiguration: undefined,
                retryPolicyConfiguration: undefined,
                requestAdapterConfiguration: undefined,
                clientP12Configuration: undefined,
            },
            onClientError: jest.fn(),
            download: jest.fn(),
            getHeaders: jest.fn(),
            addHeaders: jest.fn(),
            importClientP12: jest.fn(),
            invalidate: jest.fn(),
        };

        return new Client(mockApiClient, mockApiClient.baseUrl);
    };

    fakeIntl = (): IntlShape => {
        return {
            formatMessage: jest.fn((message) => {
                return message.defaultMessage;
            }),
        } as unknown as IntlShape;
    };

    fakeCategory = (teamId: string): Category => {
        return {
            id: '',
            display_name: 'Test Category',
            type: 'custom',
            sort_order: 0,
            sorting: 'manual',
            muted: false,
            collapsed: false,
            team_id: teamId,
        };
    };

    fakeCategoryWithId = (teamId: string): Category => {
        return {
            ...this.fakeCategory(teamId),
            id: this.generateId(),
        };
    };

    fakeCategoryChannel = (categoryId: string, channelId: string): CategoryChannel => {
        return {
            category_id: categoryId,
            channel_id: channelId,
            sort_order: random(0, 10, false),
        };
    };

    fakeCategoryChannelWithId = (teamId: string, categoryId: string, channelId: string): CategoryChannel => {
        return {
            id: teamId + channelId,
            category_id: categoryId,
            channel_id: channelId,
            sort_order: random(0, 10, false),
        };
    };

    fakeChannel = (overwrite: Partial<Channel>): Channel => {
        return {
            name: 'channel',
            team_id: this.generateId(),

            // @to-do: Make tests more detriministic;
            // https://jestjs.io/docs/snapshot-testing#2-tests-should-be-deterministic
            // display_name: `Unit Test ${name}`,
            display_name: 'Channel',
            type: 'O' as const,
            delete_at: 0,
            total_msg_count: 0,
            scheme_id: this.generateId(),
            header: '',
            purpose: '',
            last_post_at: 0,
            extra_update_at: 0,
            creator_id: this.generateId(),
            group_constrained: false,
            shared: false,
            create_at: 1507840900004,
            update_at: 1507840900004,
            id: '',
            ...overwrite,
        };
    };

    fakeChannelInfo = (overwrite: Partial<ChannelInfo>): ChannelInfo => {
        return {
            id: this.generateId(),
            guest_count: 0,
            header: '',
            member_count: 0,
            purpose: '',
            pinned_post_count: 0,
            files_count: 0,
            ...overwrite,
        };
    };

    fakeChannelWithId = (teamId: string): Channel => {
        return {
            ...this.fakeChannel({team_id: teamId}),
            id: this.generateId(),
        };
    };

    fakeDmChannel = (userId: string, otherUserId: string): Partial<Channel> => {
        return {
            name: userId > otherUserId ? otherUserId + '__' + userId : userId + '__' + otherUserId,
            team_id: '',
            display_name: `${otherUserId}`,
            type: 'D',
            status: 'offline',
            teammate_id: `${otherUserId}`,
            id: this.generateId(),
            delete_at: 0,
        };
    };

    fakeChannelMember = (overwrite: Partial<ChannelMembership>): ChannelMembership => {
        return {
            id: this.generateId(),
            user_id: this.generateId(),
            channel_id: this.generateId(),
            notify_props: {},
            roles: 'system_user',
            msg_count: 0,
            mention_count: 0,
            scheme_user: false,
            scheme_admin: false,
            last_viewed_at: 0,
            last_update_at: 0,
            ...overwrite,
        };
    };

    fakeMyChannel = (overwrite: Partial<ChannelMembership>): ChannelMembership => {
        return {
            id: this.generateId(),
            user_id: this.generateId(),
            channel_id: this.generateId(),
            last_post_at: 0,
            last_viewed_at: 0,
            manually_unread: false,
            mention_count: 0,
            msg_count: 0,
            is_unread: false,
            roles: '',
            notify_props: {},
            last_update_at: 0,
            ...overwrite,
        };
    };

    fakeMyChannelSettings = (userId: string, channelId: string): ChannelMembership => {
        return {
            ...this.fakeMyChannel({user_id: userId, channel_id: channelId}),
            notify_props: {
                desktop: 'default',
                email: 'default',
                mark_unread: 'all',
                push: 'default',
                ignore_channel_mentions: 'default',
            },
        };
    };

    fakeEmail = () => {
        return 'success' + this.generateId() + '@simulator.amazonses.com';
    };

    fakePost = (overwrite?: Partial<Post>): Post => {
        const time = Date.now();

        return {
            id: this.generateId(),
            channel_id: this.generateId(),
            create_at: time,
            update_at: time,
            message: `Unit Test ${this.generateId()}`,
            type: '',
            delete_at: 0,
            edit_at: 0,
            hashtags: '',
            is_pinned: false,
            metadata: {},
            original_id: '',
            pending_post_id: '',
            props: {},
            reply_count: 0,
            root_id: '',
            user_id: this.generateId(),
            ...overwrite,
        };
    };

    fakePostWithId = (channelId: string) => {
        return {
            ...this.fakePost({
                channel_id: channelId,
                id: this.generateId(),
                create_at: 1507840900004,
                update_at: 1507840900004,
                delete_at: 0,
            }),
        };
    };

    fakeThread = (overwrite: Partial<Thread>): Thread => {
        const id = overwrite.id ?? this.generateId();
        return {
            id,
            delete_at: 0,
            participants: [],
            post: this.fakePost({id}),
            last_reply_at: 0,
            last_viewed_at: 0,
            reply_count: 0,
            unread_mentions: 0,
            unread_replies: 0,
            ...overwrite,
        };
    };

    fakeTeam = (overwrite?: Partial<Team>): Team => {
        const name = this.generateId();
        let inviteId = this.generateId();
        if (inviteId.length > 32) {
            inviteId = inviteId.substring(0, 32);
        }

        return {
            id: this.generateId(),
            name,
            display_name: `Unit Test ${name}`,
            type: 'O' as const,
            email: this.fakeEmail(),
            allowed_domains: '',
            invite_id: inviteId,
            scheme_id: this.generateId(),
            company_name: '',
            description: '',
            allow_open_invite: true,
            group_constrained: false,
            last_team_icon_update: 0,
            create_at: 0,
            delete_at: 0,
            update_at: 0,
            ...overwrite,
        };
    };

    fakeTeamWithId = (): Team => {
        return {
            ...this.fakeTeam(),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    fakeTeamMember = (userId: string, teamId: string): TeamMembership => {
        return {
            id: teamId,
            user_id: userId,
            team_id: teamId,
            roles: 'team_user',
            delete_at: 0,
            scheme_user: false,
            scheme_admin: false,
            msg_count: 0,
            mention_count: 0,
        };
    };

    fakeQuery = <T extends Model>(returnValue: T[]): Query<T> => {
        return {
            fetch: jest.fn().mockImplementation(async () => returnValue),
            observe: jest.fn().mockImplementation(() => of$(returnValue)),
            observeCount: jest.fn().mockImplementation(() => of$(returnValue.length)),
            fetchIds: jest.fn().mockImplementation(async () => returnValue.map((v) => v.id)),
        } as unknown as Query<T>;
    };

    fakeRelation = <T extends Model>(returnValue?: T): Relation<T> => {
        return {
            fetch: jest.fn().mockImplementation(async () => returnValue!),
            _model: {} as T,
            _columnName: '',
            _relationTableName: '',
            _isImmutable: false,
            _cachedObservable: of$(returnValue!),
            id: this.generateId(),
            then: jest.fn(),
            set: jest.fn(),
            observe: jest.fn().mockImplementation(() => of$(returnValue!)),
        };
    };

    fakeModel = () => {
        return {
            id: this.generateId(),
            _raw: {} as any,
            collection: {} as any,
            collections: {} as any,
            database: {} as any,
            db: {} as any,
            asModel: {} as any,
            _isEditing: false,
            _preparedState: 'create' as const,
            syncStatus: 'synced' as const,
            table: '',
            _subscribers: [],
            _getChanges: jest.fn(),
            update: jest.fn(),
            prepareUpdate: jest.fn(),
            cancelPrepareUpdate: jest.fn(),
            prepareMarkAsDeleted: jest.fn(),
            prepareDestroyPermanently: jest.fn(),
            markAsDeleted: jest.fn(),
            destroyPermanently: jest.fn(),
            experimentalMarkAsDeleted: jest.fn(),
            experimentalDestroyPermanently: jest.fn(),
            observe: jest.fn(),
            batch: jest.fn(),
            callWriter: jest.fn(),
            callReader: jest.fn(),
            subAction: jest.fn(),
            experimentalSubscribe: jest.fn(),
            _notifyChanged: jest.fn(),
            _notifyDestroyed: jest.fn(),
            _getRaw: jest.fn(),
            _setRaw: jest.fn(),
            _dangerouslySetRawWithoutMarkingColumnChange: jest.fn(),
            __ensureCanSetRaw: jest.fn(),
            __ensureNotDisposable: jest.fn(),
        };
    };

    fakeUserModel = (overwrite?: Partial<UserModel>): UserModel => {
        const modelBase = this.fakeModel();
        return {
            ...modelBase,
            email: this.fakeEmail(),
            locale: DEFAULT_LOCALE,
            username: this.generateId(),
            firstName: this.generateId(),
            lastName: this.generateId(),
            deleteAt: 0,
            roles: 'system_user',
            authService: '',
            id: this.generateId(),
            nickname: '',
            notifyProps: this.fakeUserNotifyProps(),
            position: '',
            updateAt: 0,
            isBot: false,
            isGuest: false,
            lastPictureUpdate: 0,
            status: 'offline',
            remoteId: null,
            props: {},
            timezone: {automaticTimezone: 'UTC', manualTimezone: '', useAutomaticTimezone: true},
            mentionKeys: [],
            userMentionKeys: [],
            highlightKeys: [],
            termsOfServiceId: '',
            termsOfServiceCreateAt: 0,

            channelsCreated: this.fakeQuery([]),
            channels: this.fakeQuery([]),
            customProfileAttributes: this.fakeQuery([]),
            posts: this.fakeQuery([]),
            preferences: this.fakeQuery([]),
            reactions: this.fakeQuery([]),
            teams: this.fakeQuery([]),
            threadParticipations: this.fakeQuery([]),

            prepareStatus: () => null,

            ...overwrite,
        };
    };

    fakeChannelModel = (overwrite?: Partial<ChannelModel>): ChannelModel => {
        return {
            ...this.fakeModel(),
            createAt: 0,
            creatorId: this.generateId(),
            deleteAt: 0,
            updateAt: 0,
            displayName: this.generateId(),
            isGroupConstrained: false,
            name: this.generateId(),
            shared: false,
            teamId: this.generateId(),
            type: 'O' as const,
            members: this.fakeQuery([]),
            drafts: this.fakeQuery([]),
            bookmarks: this.fakeQuery([]),
            posts: this.fakeQuery([]),
            postsInChannel: this.fakeQuery([]),
            team: this.fakeRelation(),
            creator: this.fakeRelation(),
            info: this.fakeRelation(),
            membership: this.fakeRelation(),
            categoryChannel: this.fakeRelation(),
            playbookRuns: this.fakeQuery([]),
            toApi: jest.fn(),
            ...overwrite,
        };
    };

    fakeChannelMembershipModel = (overwrite?: Partial<ChannelMembershipModel>): ChannelMembershipModel => {
        return {
            ...this.fakeModel(),
            channelId: this.generateId(),
            userId: this.generateId(),
            schemeAdmin: false,
            memberChannel: this.fakeRelation(),
            memberUser: this.fakeRelation(),
            getAllChannelsForUser: this.fakeQuery([]),
            getAllUsersInChannel: this.fakeQuery([]),
            ...overwrite,
        };
    };

    fakeCategoryChannelModel = (overwrite?: Partial<CategoryChannelModel>): CategoryChannelModel => {
        return {
            ...this.fakeModel(),
            channel: this.fakeRelation(),
            categoryId: this.generateId(),
            channelId: this.generateId(),
            sortOrder: 0,
            category: this.fakeRelation(),
            myChannel: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakeDraftModel = (overwrite?: Partial<DraftModel>): DraftModel => {
        return {
            ...this.fakeModel(),
            channelId: this.generateId(),
            message: '',
            rootId: '',
            files: [],
            metadata: {},
            updateAt: 0,
            ...overwrite,
        };
    };

    fakePostsInChannelModel = (overwrite?: Partial<PostsInChannelModel>): PostsInChannelModel => {
        return {
            ...this.fakeModel(),
            channelId: this.generateId(),
            earliest: 0,
            latest: 0,
            channel: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakeChannelBookmarkModel = (overwrite?: Partial<ChannelBookmarkModel>): ChannelBookmarkModel => {
        return {
            ...this.fakeModel(),
            channelId: this.generateId(),
            ownerId: this.generateId(),
            fileId: this.generateId(),
            displayName: this.generateId(),
            createAt: 0,
            updateAt: 0,
            deleteAt: 0,
            sortOrder: 0,
            type: 'file',
            channel: this.fakeRelation(),
            owner: this.fakeRelation(),
            file: this.fakeRelation(),
            toApi: jest.fn(),
            ...overwrite,
        };
    };

    fakeFileModel = (overwrite?: Partial<FileModel>): FileModel => {
        return {
            ...this.fakeModel(),
            id: this.generateId(),
            extension: 'png',
            height: 100,
            width: 100,
            mimeType: 'image/png',
            name: 'image1',
            size: 100,
            imageThumbnail: '',
            localPath: 'path/to/image1',
            postId: this.generateId(),
            post: this.fakeRelation(),
            toFileInfo: jest.fn(),
            isBlocked: false,
            ...overwrite,
        };
    };

    fakeMyChannelSettingsModel = (overwrite?: Partial<MyChannelSettingsModel>): MyChannelSettingsModel => {
        return {
            ...this.fakeModel(),
            notifyProps: this.fakeChannelNotifyProps(),
            myChannel: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakeTeamModel = (overwrite?: Partial<TeamModel>): TeamModel => {
        return {
            ...this.fakeModel(),
            id: this.generateId(),
            name: this.generateId(),
            displayName: this.generateId(),
            type: 'O' as const,
            allowedDomains: '',
            inviteId: this.generateId(),
            description: '',
            updateAt: 0,
            isAllowOpenInvite: true,
            isGroupConstrained: false,
            lastTeamIconUpdatedAt: 0,
            categories: this.fakeQuery([]),
            channels: this.fakeQuery([]),
            myTeam: this.fakeRelation(),
            teamChannelHistory: this.fakeRelation(),
            members: this.fakeQuery([]),
            teamSearchHistories: this.fakeQuery([]),
            playbookRuns: this.fakeQuery([]),
            ...overwrite,
        };
    };

    fakeChannelInfoModel = (overwrite?: Partial<ChannelInfoModel>): ChannelInfoModel => {
        return {
            ...this.fakeModel(),
            guestCount: 0,
            header: '',
            memberCount: 0,
            pinnedPostCount: 0,
            filesCount: 0,
            purpose: '',
            channel: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakePostModel = (overwrite?: Partial<PostModel>): PostModel => {
        return {
            ...this.fakeModel(),
            channelId: this.generateId(),
            createAt: 0,
            deleteAt: 0,
            editAt: 0,
            isPinned: false,
            message: '',
            metadata: {},
            originalId: '',
            pendingPostId: '',
            props: {},
            rootId: '',
            type: '',
            updateAt: 0,
            messageSource: '',
            previousPostId: '',
            userId: this.generateId(),
            root: this.fakeQuery([]),
            drafts: this.fakeQuery([]),
            files: this.fakeQuery([]),
            postsInThread: this.fakeQuery([]),
            reactions: this.fakeQuery([]),
            author: this.fakeRelation(),
            channel: this.fakeRelation(),
            thread: this.fakeRelation(),
            hasReplies: async () => false,
            toApi: jest.fn(),
            ...overwrite,
        };
    };

    fakeGroupModel = (overwrite?: Partial<GroupModel>): GroupModel => {
        return {
            ...this.fakeModel(),
            name: this.generateId(),
            displayName: this.generateId(),
            description: this.generateId(),
            source: this.generateId(),
            remoteId: this.generateId(),
            createdAt: 0,
            updatedAt: 0,
            deletedAt: 0,
            memberCount: 0,
            channels: this.fakeQuery([]),
            teams: this.fakeQuery([]),
            members: this.fakeQuery([]),
            ...overwrite,
        };
    };

    fakeMyChannelModel = (overwrite?: Partial<MyChannelModel>): MyChannelModel => {
        return {
            ...this.fakeModel(),
            lastPostAt: 0,
            lastFetchedAt: 0,
            lastViewedAt: 0,
            manuallyUnread: false,
            mentionsCount: 0,
            messageCount: 0,
            isUnread: false,
            roles: '',
            viewedAt: 0,
            lastPlaybookRunsFetchAt: 0,
            channel: this.fakeRelation(),
            settings: this.fakeRelation(),
            resetPreparedState: jest.fn(),
            ...overwrite,
        };
    };

    fakeRoleModel = (overwrite?: Partial<RoleModel>): RoleModel => {
        return {
            ...this.fakeModel(),
            name: this.generateId(),
            permissions: [],
            ...overwrite,
        };
    };

    fakeThreadModel = (overwrite?: Partial<ThreadModel>): ThreadModel => {
        return {
            ...this.fakeModel(),
            lastReplyAt: 0,
            lastFetchedAt: 0,
            lastViewedAt: 0,
            replyCount: 0,
            isFollowing: false,
            unreadReplies: 0,
            unreadMentions: 0,
            viewedAt: 0,
            participants: this.fakeQuery([]),
            threadsInTeam: this.fakeQuery([]),
            post: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakeMyTeamModel = (overwrite?: Partial<MyTeamModel>): MyTeamModel => {
        return {
            ...this.fakeModel(),
            roles: '',
            team: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakeScheduledPostModel = (overwrite?: Partial<ScheduledPostModel>): ScheduledPostModel => {
        return {
            ...this.fakeModel(),
            id: this.generateId(),
            createAt: 0,
            updateAt: 0,
            channelId: this.generateId(),
            message: '',
            rootId: '',
            files: [],
            metadata: {},
            scheduledAt: 0,
            processedAt: 0,
            errorCode: '',
            toApi: jest.fn(),
            ...overwrite,
        };
    };

    fakeScheduledPost = (overwrite?: Partial<ScheduledPost>): ScheduledPost => {
        return {
            id: this.generateId(),
            channel_id: this.generateId(),
            message: '',
            root_id: '',
            files: [],
            metadata: {},
            create_at: Date.now(),
            update_at: Date.now(),
            scheduled_at: Date.now(),
            processed_at: 0,
            error_code: '',
            user_id: this.generateId(),
            ...overwrite,
        };
    };

    fakePreferenceModel = (overwrite?: Partial<PreferenceModel>): PreferenceModel => {
        return {
            ...this.fakeModel(),
            value: '',
            category: '',
            name: '',
            userId: '',
            user: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakeCustomProfileFieldModel = (overwrite?: Partial<CustomProfileFieldModel>): CustomProfileFieldModel => {
        return {
            ...this.fakeModel(),
            groupId: '',
            name: `field_${this.generateId()}`,
            type: 'text',
            targetId: '',
            targetType: 'user',
            createAt: Date.now(),
            updateAt: Date.now(),
            deleteAt: 0,
            attrs: {sort_order: 1},
            customProfileAttributes: this.fakeQuery([]),
            ...overwrite,
        };
    };

    fakeCustomProfileAttributeModel = (overwrite?: Partial<CustomProfileAttributeModel>): CustomProfileAttributeModel => {
        return {
            ...this.fakeModel(),
            fieldId: this.generateId(),
            userId: this.generateId(),
            value: '',
            field: this.fakeRelation(),
            user: this.fakeRelation(),
            ...overwrite,
        };
    };

    fakeRole = (overwrite?: Partial<Role>): Role => {
        return {
            id: this.generateId(),
            name: this.generateId(),
            permissions: [],
            ...overwrite,
        };
    };

    fakeUser = (overwrite?: Partial<UserProfile>): UserProfile => {
        return {
            email: this.fakeEmail(),
            locale: DEFAULT_LOCALE,
            username: this.generateId(),
            first_name: this.generateId(),
            last_name: this.generateId(),
            create_at: Date.now(),
            delete_at: 0,
            roles: 'system_user',
            auth_service: '',
            id: this.generateId(),
            nickname: '',
            notify_props: this.fakeUserNotifyProps(),
            position: '',
            update_at: 0,
            ...overwrite,
        };
    };

    fakeUserNotifyProps = (overwrite?: Partial<UserNotifyProps>): UserNotifyProps => {
        return {
            channel: 'false',
            comments: 'root',
            desktop: 'default',
            desktop_sound: 'false',
            email: 'false',
            first_name: 'false',
            highlight_keys: '',
            mention_keys: '',
            push: 'default',
            push_status: 'away',
            calls_desktop_sound: 'true',
            calls_mobile_notification_sound: Ringtone.Calm,
            calls_mobile_sound: 'true',
            calls_notification_sound: '',
            ...overwrite,
        };
    };

    fakeChannelNotifyProps = (overwrite?: Partial<ChannelNotifyProps>): ChannelNotifyProps => {
        return {
            channel_auto_follow_threads: 'on',
            desktop: 'default',
            email: 'default',
            mark_unread: 'all',
            push: 'default',
            ignore_channel_mentions: 'off',
            push_threads: 'mention',
            ...overwrite,
        };
    };

    fakeOutgoingHook = (teamId: string) => {
        return {
            team_id: teamId,
        };
    };

    fakeOutgoingHookWithId = (teamId: string) => {
        return {
            ...this.fakeOutgoingHook(teamId),
            id: this.generateId(),
        };
    };

    fakeFiles = (count: number) => {
        const files = [];
        while (files.length < count) {
            files.push({
                id: this.generateId(),
            });
        }

        return files;
    };

    fakeOAuthApp = () => {
        return {
            name: this.generateId(),
            callback_urls: ['http://localhost/notrealurl'],
            homepage: 'http://localhost/notrealurl',
            description: 'fake app',
            is_trusted: false,
            icon_url: 'http://localhost/notrealurl',
            update_at: 1507841118796,
        };
    };

    fakeOAuthAppWithId = () => {
        return {
            ...this.fakeOAuthApp(),
            id: this.generateId(),
        };
    };

    fakeBot = () => {
        return {
            user_id: this.generateId(),
            username: this.generateId(),
            display_name: 'Fake bot',
            owner_id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    fakeFileInfo = (overwrite: Partial<FileInfo> = {}): FileInfo => {
        return {
            id: '1',
            localPath: 'path/to/image1',
            uri: '',
            has_preview_image: true,
            extension: 'png',
            height: 100,
            width: 100,
            mime_type: 'image/png',
            name: 'image1',
            size: 100,
            user_id: '1',
            ...overwrite,
        };
    };

    createPlaybookItem =(prefix: string, index: number): PlaybookChecklistItem => ({
        id: `${prefix}-item_${index}`,
        title: `Item ${index + 1} of Checklist ${prefix}`,
        description: 'Item description',
        state: '',
        state_modified: 0,
        assignee_id: '',
        assignee_modified: 0,
        command: '',
        command_last_run: 0,
        due_date: 0,
        completed_at: 0,
        task_actions: [],
        condition_action: '',
        condition_reason: '',
        update_at: 0,
    });

    createPlaybookChecklist = (prefix: string, itemsCount: number, index: number): PlaybookChecklist => {
        const items: PlaybookChecklistItem[] = [];
        const id = `${prefix}-checklist_${index}`;
        for (let k = 0; k < itemsCount; k++) {
            items.push(this.createPlaybookItem(id, k));
        }

        return {
            id: `${prefix}-checklist_${index}`,
            title: `Checklist ${index + 1} of Playbook Run ${prefix}`,
            update_at: 0,
            items_order: items.map((item) => item.id),
            items,
        };
    };

    createPlaybookRuns = (runsCount = 1, maxChecklistCount = 1, maxItemsPerChecklist = 1, omitRandom = false): PlaybookRun[] => {
        const playbookRuns: PlaybookRun[] = [];
        for (let i = 0; i < runsCount; i++) {
            const checklists: PlaybookChecklist[] = [];
            const checklistCount = omitRandom ? maxChecklistCount : Math.floor(Math.random() * maxChecklistCount) + 1;
            for (let j = 0; j < checklistCount; j++) {
                const itemsCount = omitRandom ? maxItemsPerChecklist : Math.floor(Math.random() * maxItemsPerChecklist) + 1;
                checklists.push(this.createPlaybookChecklist(`playbook_run_${i}`, itemsCount, j));
            }
            playbookRuns.push({
                id: `playbook_run_${i}`,
                name: `Playbook Run ${i + 1}`,
                playbook_id: 'playbook_1',
                post_id: 'post_1',
                owner_user_id: 'user_1',
                team_id: 'team_1',
                channel_id: 'channel_1',
                create_at: Date.now() + i,
                end_at: 0,
                description: 'This is a test playbook run',
                is_active: true,
                active_stage: 1,
                active_stage_title: 'Stage 1',
                participant_ids: ['user_1', 'user_2'],
                summary: 'Test summary',
                current_status: 'InProgress',
                last_status_update_at: Date.now() + i,
                retrospective_enabled: true,
                retrospective: 'Test retrospective',
                retrospective_published_at: Date.now() + i,
                summary_modified_at: 0,
                reported_user_id: '',
                previous_reminder: 0,
                status_update_enabled: false,
                retrospective_was_canceled: false,
                retrospective_reminder_interval_seconds: 0,
                message_on_join: '',
                category_name: '',
                create_channel_member_on_new_participant: false,
                remove_channel_member_on_removed_participant: false,
                invited_user_ids: [],
                invited_group_ids: [],
                timeline_events: [],
                broadcast_channel_ids: [],
                webhook_on_creation_urls: [],
                webhook_on_status_update_urls: [],
                status_posts: [],
                metrics_data: [],
                checklists,
                update_at: Date.now() + i,
                items_order: checklists.map((checklist) => checklist.id),
            });
        }
        return playbookRuns;
    };

    fakePlaybookRun = (overwrite: Partial<PlaybookRun> = {}): PlaybookRun => {
        const run = this.createPlaybookRuns(1, 0, 0);

        return {
            ...run[0],
            ...overwrite,
        };
    };

    fakePlaybookChecklist = (runId: string, overwrite: Partial<PlaybookChecklist>): PlaybookChecklist & WithRunId => {
        const checklist = this.createPlaybookChecklist(runId, 1, 0);
        return {
            run_id: runId,
            ...checklist,
            ...overwrite,
        };
    };

    fakePlaybookChecklistItem = (checklistId: string, overwrite: Partial<PlaybookChecklistItem>): PlaybookChecklistItem & WithChecklistId => {
        const item = this.createPlaybookItem(checklistId, 0);
        return {
            checklist_id: checklistId,
            ...item,
            ...overwrite,
        };
    };

    fakePlaybookRunModel = (overwrite: Partial<PlaybookRunModel> = {}): PlaybookRunModel => {
        return {
            ...this.fakeModel(),
            playbookId: this.generateId(),
            postId: null,
            ownerUserId: this.basicUser?.id || '',
            teamId: this.basicTeam?.id || '',
            channelId: this.basicChannel?.id || '',
            createAt: Date.now(),
            endAt: 0,
            name: 'name',
            description: 'description',
            isActive: true,
            activeStage: 1,
            activeStageTitle: 'activeStageTitle',
            participantIds: [],
            summary: 'summary',
            currentStatus: 'InProgress',
            lastStatusUpdateAt: 0,
            retrospectiveEnabled: false,
            retrospective: '',
            retrospectivePublishedAt: 0,
            sync: 'synced',
            lastSyncAt: 0,
            post: this.fakeRelation(),
            team: this.fakeRelation(),
            channel: this.fakeRelation(),
            owner: this.fakeRelation(),
            checklists: this.fakeQuery([]),
            prepareDestroyWithRelations: jest.fn().mockResolvedValue([]),
            previousReminder: 0,
            itemsOrder: [],
            updateAt: 0,
            ...overwrite,
        };
    };

    fakePlaybookChecklistModel = (overwrite: Partial<PlaybookChecklistModel> = {}): PlaybookChecklistModel => {
        return {
            ...this.fakeModel(),
            runId: this.generateId(),
            title: 'title',
            items: this.fakeQuery([]),
            id: this.generateId(),
            sync: 'synced',
            lastSyncAt: 0,
            run: this.fakeRelation(),
            itemsOrder: [],
            updateAt: 0,
            prepareDestroyWithRelations: jest.fn().mockResolvedValue([]),
            ...overwrite,
        };
    };

    fakePlaybookChecklistItemModel = (overwrite: Partial<PlaybookChecklistItemModel> = {}): PlaybookChecklistItemModel => {
        return {
            ...this.fakeModel(),
            checklistId: this.generateId(),
            title: 'title',
            state: '',
            stateModified: 0,
            assigneeId: null,
            assigneeModified: 0,
            command: null,
            commandLastRun: 0,
            description: 'description',
            dueDate: 0,
            completedAt: 0,
            sync: 'synced',
            lastSyncAt: 0,
            taskActions: [],
            conditionAction: '',
            conditionReason: '',
            checklist: this.fakeRelation(),
            updateAt: 0,
            ...overwrite,
        };
    };

    fakeWebsocketMessage = (overwrite: Partial<WebSocketMessage> = {}): WebSocketMessage => {
        return {
            event: 'test',
            data: {},
            broadcast: {
                omit_users: {},
                user_id: '',
                channel_id: '',
                team_id: '',
            },
            seq: 0,
            ...overwrite,
        };
    };

    mockLogin = () => {
        nock(this.basicClient?.getBaseRoute() || '').
            post('/users/login').
            reply(200, this.basicUser!, {'X-Version-Id': 'Server Version'});

        nock(this.basicClient?.getBaseRoute() || '').
            get('/users/me/teams/members').
            reply(200, [this.basicTeamMember]);

        nock(this.basicClient?.getBaseRoute() || '').
            get('/users/me/teams/unread').
            reply(200, [{team_id: this.basicTeam!.id, msg_count: 0, mention_count: 0}]);

        nock(this.basicClient?.getBaseRoute() || '').
            get('/users/me/teams').
            reply(200, [this.basicTeam]);

        nock(this.basicClient?.getBaseRoute() || '').
            get('/users/me/preferences').
            reply(200, [{user_id: this.basicUser!.id, category: 'tutorial_step', name: this.basicUser!.id, value: '999'}]);
    };

    initMockEntities = () => {
        this.basicUser = this.fakeUser();
        this.basicUser.roles = 'system_user system_admin';
        this.basicTeam = this.fakeTeamWithId();
        this.basicTeamMember = this.fakeTeamMember(this.basicUser.id, this.basicTeam.id);
        this.basicCategory = this.fakeCategoryWithId(this.basicTeam.id);
        this.basicChannel = this.fakeChannelWithId(this.basicTeam.id);
        this.basicCategoryChannel = this.fakeCategoryChannelWithId(this.basicTeam.id, this.basicCategory.id, this.basicChannel.id);
        this.basicChannelMember = this.fakeChannelMember({user_id: this.basicUser.id, channel_id: this.basicChannel.id});
        this.basicMyChannel = this.fakeMyChannel({user_id: this.basicUser.id, channel_id: this.basicChannel.id});
        this.basicMyChannelSettings = this.fakeMyChannelSettings(this.basicUser.id, this.basicChannel.id);
        this.basicPost = {...this.fakePostWithId(this.basicChannel.id), create_at: 1507841118796} as Post;
        this.basicRoles = {
            system_admin: {
                id: this.generateId(),
                name: 'system_admin',
                display_name: 'authentication.roles.global_admin.name',
                description: 'authentication.roles.global_admin.description',
                permissions: [
                    'system_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            system_user: {
                id: this.generateId(),
                name: 'system_user',
                display_name: 'authentication.roles.global_user.name',
                description: 'authentication.roles.global_user.description',
                permissions: [
                    'system_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            team_admin: {
                id: this.generateId(),
                name: 'team_admin',
                display_name: 'authentication.roles.team_admin.name',
                description: 'authentication.roles.team_admin.description',
                permissions: [
                    'team_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            team_user: {
                id: this.generateId(),
                name: 'team_user',
                display_name: 'authentication.roles.team_user.name',
                description: 'authentication.roles.team_user.description',
                permissions: [
                    'team_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            channel_admin: {
                id: this.generateId(),
                name: 'channel_admin',
                display_name: 'authentication.roles.channel_admin.name',
                description: 'authentication.roles.channel_admin.description',
                permissions: [
                    'channel_admin_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
            channel_user: {
                id: this.generateId(),
                name: 'channel_user',
                display_name: 'authentication.roles.channel_user.name',
                description: 'authentication.roles.channel_user.description',
                permissions: [
                    'channel_user_permission',
                ],
                scheme_managed: true,
                built_in: true,
            },
        };
    };

    initBasic = async (client = this.createClient()) => {
        client.apiClient.baseUrl = Config.TestServerUrl || Config.DefaultServerUrl;
        this.basicClient = client;

        this.initMockEntities();
        this.activateMocking();

        return {
            client: this.basicClient,
            user: this.basicUser,
            team: this.basicTeam,
            channel: this.basicChannel,
            post: this.basicPost,
        };
    };

    mockScheme = () => {
        return {
            name: this.generateId(),
            description: this.generateId(),
            scope: 'channel',
            defaultchanneladminrole: false,
            defaultchanneluserrole: false,
        };
    };

    mockSchemeWithId = () => {
        return {
            ...this.mockScheme(),
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
        };
    };

    testIncomingHook = () => {
        return {
            id: this.generateId(),
            create_at: 1507840900004,
            update_at: 1507840900004,
            delete_at: 0,
            user_id: this.basicUser!.id,
            channel_id: this.basicChannel!.id,
            team_id: this.basicTeam!.id,
            display_name: 'test',
            description: 'test',
        };
    };

    testOutgoingHook = () => {
        return {
            id: this.generateId(),
            token: this.generateId(),
            create_at: 1507841118796,
            update_at: 1507841118796,
            delete_at: 0,
            creator_id: this.basicUser!.id,
            channel_id: this.basicChannel!.id,
            team_id: this.basicTeam!.id,
            trigger_words: ['testword'],
            trigger_when: 0,
            callback_urls: ['http://localhost/notarealendpoint'],
            display_name: 'test',
            description: '',
            content_type: 'application/x-www-form-urlencoded',
        };
    };

    testCommand = (teamId: string) => {
        return {
            trigger: this.generateId(),
            method: 'P',
            create_at: 1507841118796,
            update_at: 1507841118796,
            delete_at: 0,
            creator_id: this.basicUser!.id,
            team_id: teamId,
            username: 'test',
            icon_url: 'http://localhost/notarealendpoint',
            auto_complete: true,
            auto_complete_desc: 'test',
            auto_complete_hint: 'test',
            display_name: 'test',
            description: 'test',
            url: 'http://localhost/notarealendpoint',
        };
    };

    tearDown = async () => {
        nock.restore();

        this.basicClient = null;
        this.basicUser = null;
        this.basicTeam = null;
        this.basicTeamMember = null;
        this.basicChannel = null;
        this.basicChannelMember = null;
        this.basicPost = null;
    };

    wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));
    tick = () => new Promise((r) => setImmediate(r));

    mockQuery = <T extends Model>(returnValue: T | T[]) => {
        return {
            fetch: async () => returnValue,
            observe: of$(returnValue),
        } as unknown as Query<T>;
    };
}

const TestHelper = new TestHelperSingleton();
export default TestHelper;
