// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type ChannelModel from '@typings/database/models/servers/channel';
import type ChannelInfoModel from '@typings/database/models/servers/channel_info';
import type TeamModel from '@typings/database/models/servers/team';
import type UserModel from '@typings/database/models/servers/user';

export function toApiUserProfile(source: ExperienceUser, existing?: UserModel): UserProfile {
    return {
        id: source.id,
        create_at: source.create_at ?? 0,
        update_at: source.update_at ?? 0,
        delete_at: source.delete_at,
        username: source.username,
        auth_service: source.auth_service,
        email: source.email,
        nickname: source.nickname,
        first_name: source.first_name,
        last_name: source.last_name,
        position: source.position,
        roles: source.roles,
        props: source.props ?? {},
        notify_props: source.notify_props ?? {} as UserNotifyProps,
        last_picture_update: source.last_picture_update ?? 0,
        locale: source.locale,
        timezone: source.timezone,
        terms_of_service_id: source.terms_of_service_id,
        terms_of_service_create_at: source.terms_of_service_create_at,
        is_bot: existing?.isBot,
        remote_id: existing?.remoteId ?? undefined,
        status: existing?.status,
    };
}

// email/company_name/scheme_id have no local DB backing.
export function toApiTeam(source: ExperienceTeam, existing?: TeamModel): Team {
    return {
        id: source.id,
        create_at: source.create_at ?? 0,
        update_at: source.update_at ?? 0,
        delete_at: source.delete_at ?? 0,
        display_name: source.display_name,
        name: source.name,
        type: source.type as TeamType,
        invite_id: source.invite_id ?? existing?.inviteId ?? '',
        group_constrained: source.group_constrained,
        last_team_icon_update: source.last_team_icon_update ?? existing?.lastTeamIconUpdatedAt ?? 0,
        description: existing?.description ?? '',
        allowed_domains: existing?.allowedDomains ?? '',
        allow_open_invite: existing?.isAllowOpenInvite ?? false,
        email: '',
        company_name: '',
        scheme_id: '',
    };
}

// mention_count/msg_count have no backing on TeamMembershipModel.
export function toApiTeamMembership(source: ExperienceTeamMember): TeamMembership {
    return {
        team_id: source.team_id,
        user_id: source.user_id,
        roles: source.roles,
        delete_at: source.delete_at,
        scheme_user: source.scheme_user,
        scheme_admin: source.scheme_admin,
        mention_count: 0,
        msg_count: 0,
    };
}

// header/purpose live on ChannelInfoModel, a separate table from ChannelModel.
// extra_update_at/scheme_id have no local DB backing.
export function toApiChannel(source: ExperienceChannel, existing?: ChannelModel, existingInfo?: ChannelInfoModel): Channel {
    return {
        id: source.id,
        create_at: source.create_at ?? 0,
        update_at: source.update_at ?? 0,
        delete_at: source.delete_at ?? 0,
        team_id: source.team_id,
        type: source.type,
        display_name: source.display_name,
        name: source.name,
        header: existingInfo?.header ?? '',
        purpose: existingInfo?.purpose ?? '',
        last_post_at: source.last_post_at,
        last_root_post_at: source.last_root_post_at ?? 0,
        total_msg_count: source.total_msg_count,
        total_msg_count_root: source.total_msg_count_root ?? 0,
        extra_update_at: 0,
        creator_id: source.creator_id ?? '',
        scheme_id: null,
        group_constrained: source.group_constrained,
        shared: source.shared ?? false,
        policy_enforced: source.policy_enforced ?? false,
        banner_info: existing?.bannerInfo,
        autotranslation: existing?.autotranslation ?? false,
    };
}
