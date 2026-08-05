#!/usr/bin/env python3
"""Slim bloated beforeAll leftovers from one-it-per-file E2E splits."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOKMARK_DIR = ROOT / "detox/e2e/test/products/channels/channels"
MEMBERS_DIR = ROOT / "detox/e2e/test/products/channels/channel_settings"

# Per-file: which channel var the it() uses, and optional bookmark prep.
BOOKMARK_NEEDS: dict[str, dict] = {
    "change_icon_emoji_bookmark.e2e.ts": {
        "channel": "channelT5606",
        "bookmark_var": "bookmarkT5606",
        "bookmark_title": "Emoji Icon Test",
        "bookmark_url": "https://example.com",
    },
    "revert_bookmark_icon_emoji_default.e2e.ts": {
        "channel": "channelT5607",
        "bookmark_var": "bookmarkT5607",
        "bookmark_title": "Revert Emoji Test",
        "bookmark_url": "https://example.com",
    },
    "display_bookmark_bar_below_channel.e2e.ts": {
        "channel": "channelT5609",
        "bookmark_title": "Banner Test Bookmark",
        "bookmark_url": "https://mattermost.com",
    },
    "show_fallback_bookmark_icon_no_favicon.e2e.ts": {
        "channel": "channelT5605",
        "bookmark_title": "No Favicon Bookmark",
        "bookmark_url": "https://example.com",
    },
    "show_scroll_indicator_bookmarks_exceed.e2e.ts": {
        "channel": "channelT5612",
        "scroll_bookmarks": 12,
    },
    "show_error_adding_bookmark_invalid_url.e2e.ts": {
        "channel": "channelT5608",
    },
    "show_add_bookmark_option_channel_info.e2e.ts": {
        "channel": "channelT5600",
    },
    "show_add_bookmark_option_no_bookmarks.e2e.ts": {
        "channel": "channelT5601",
    },
    "add_bookmark_link_channel_info.e2e.ts": {
        "channel": "channelT5602",
    },
    "auto_populate_title_page_adding_bookmark.e2e.ts": {
        "channel": "channelT5604",
    },
}

MEMBERS_NEEDS: dict[str, dict] = {
    "remove_user_private_channel.e2e.ts": {
        "needs_base_channel": False,
        "private_channel_var": "privateChannel2",
        "private_user_var": "removeMeUser",
        "private_user_prefix": "removeme",
        "private_user_in_channel": True,
    },
    "add_user_private_channel.e2e.ts": {
        "needs_base_channel": False,
        "private_channel_var": "privateChannel1",
        "private_user_var": "privUser",
        "private_user_prefix": "privuser",
        "private_user_in_channel": False,
    },
    "add_members_channel.e2e.ts": {
        "needs_base_channel": True,
        "team_user_var": "addMemberUser",
        "team_user_prefix": "addmember",
        "team_user_in_channel": False,
    },
    "add_existing_users_public_channel_drop.e2e.ts": {
        "needs_base_channel": True,
        "team_user_var": "user2",
        "team_user_prefix": "user2",
        "team_user_in_channel": False,
    },
    "manage_members_channel.e2e.ts": {
        "needs_base_channel": True,
        "team_user_var": "memberUser",
        "team_user_prefix": "member",
        "team_user_in_channel": True,
    },
    "view_members_gm.e2e.ts": {
        "needs_base_channel": False,
        "gm_users": True,
    },
}


CREATE_CHANNEL_HELPER = """
    const createChannel = async () => {
        const {channel} = await Channel.apiCreateChannel(siteOneUrl, {
            type: 'O',
            teamId: testTeam.id,
        });
        if (!channel?.id) {
            throw new Error('[beforeAll] Failed to create channel');
        }
        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, channel.id);
        return channel;
    };
"""


def slim_bookmark_file(path: Path, needs: dict) -> bool:
    text = path.read_text()
    if "const createChannel = async" not in text:
        return False

    channel = needs["channel"]
    decls = [
        "    let testTeam: any;",
        "    let testUser: any;",
        f"    let {channel}: any;",
    ]
    if needs.get("bookmark_var"):
        decls.append(f"    let {needs['bookmark_var']}: any;")

    # Replace declaration block from first let testTeam/testUser/channelT through bookmark lets
    text2 = re.sub(
        r"    let testTeam: any;\n(?:    let .*\n)*?(?=    const getVisibleTextElement|    const waitForBookmarkInChannelInfo|    const createChannel)",
        "\n".join(decls) + "\n\n",
        text,
        count=1,
    )

    # Ensure createChannel has id guard
    text2 = re.sub(
        r"    const createChannel = async \(\) => \{\n"
        r"        const \{channel\} = await Channel\.apiCreateChannel\(siteOneUrl, \{\n"
        r"            type: 'O',\n"
        r"            teamId: testTeam\.id,\n"
        r"        \}\);\n"
        r"        await Channel\.apiAddUserToChannel\(siteOneUrl, testUser\.id, channel\.id\);\n"
        r"        return channel;\n"
        r"    \};",
        CREATE_CHANNEL_HELPER.strip("\n"),
        text2,
        count=1,
    )

    bookmark_prep = []
    if needs.get("bookmark_var"):
        bookmark_prep.append(
            f"""
        const {{bookmark: b}} = await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, {channel}.id, '{needs["bookmark_title"]}', '{needs["bookmark_url"]}',
        );
        if (!b?.id) {{
            throw new Error('[beforeAll] Failed to create {needs["bookmark_var"]}');
        }}
        {needs["bookmark_var"]} = b;"""
        )
    elif needs.get("bookmark_title"):
        bookmark_prep.append(
            f"""
        await ChannelBookmark.apiCreateChannelBookmarkLink(
            siteOneUrl, {channel}.id, '{needs["bookmark_title"]}', '{needs["bookmark_url"]}',
        );"""
        )
    if needs.get("scroll_bookmarks"):
        n = needs["scroll_bookmarks"]
        bookmark_prep.append(
            f"""
        /* eslint-disable no-await-in-loop */
        for (let i = 1; i <= {n}; i++) {{
            await ChannelBookmark.apiCreateChannelBookmarkLink(
                siteOneUrl, {channel}.id, `Scroll Bookmark ${{i}}`, `https://example.com/${{i}}`,
            );
        }}
        /* eslint-enable no-await-in-loop */"""
        )

    new_before_all = f"""
    beforeAll(async () => {{
        const {{team, user}} = await Setup.apiInit(siteOneUrl);
        testTeam = team;
        testUser = user;

        {channel} = await createChannel();

        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);
        await LoginScreen.login(testUser);
{"".join(bookmark_prep)}

        await wait(timeouts.TWO_SEC);
        await device.reloadReactNative();
        await ChannelListScreen.toBeVisible();
    }});
"""

    text3, n = re.subn(
        r"    beforeAll\(async \(\) => \{.*?\n    \}\);",
        new_before_all.strip("\n") + "\n",
        text2,
        count=1,
        flags=re.S,
    )
    if n != 1:
        print(f"  WARN: beforeAll replace failed for {path.name}")
        return False

    if text3 != text:
        path.write_text(text3)
        return True
    return False


def slim_members_file(path: Path, needs: dict) -> bool:
    text = path.read_text()
    if "Test 1 (MM-T3195)" not in text and "gmuser1" not in text:
        # already slim or different shape
        if "privateChannel2" in text and needs.get("private_channel_var") == "privateChannel2":
            pass
        else:
            return False

    decls = [
        "    let testUser: any;",
        "    let testTeam: any;",
    ]
    setup_lines = [
        "        const {user, team, channel} = await Setup.apiInit(siteOneUrl);",
        "        testUser = user;",
        "        testTeam = team;",
    ]
    if needs.get("needs_base_channel"):
        decls.append("    let testChannel: any;")
        setup_lines.append("        testChannel = channel;")

    if needs.get("private_channel_var"):
        decls.append(f"    let {needs['private_channel_var']}: any;")
        decls.append(f"    let {needs['private_user_var']}: any;")
        setup_lines += [
            "        const {channel: privChan} = await Channel.apiCreateChannel(siteOneUrl, {",
            "            teamId: testTeam.id,",
            "            type: 'P',",
            "        });",
            "        if (!privChan?.id) {",
            "            throw new Error('[beforeAll] Failed to create private channel');",
            "        }",
            "        await Channel.apiAddUserToChannel(siteOneUrl, testUser.id, privChan.id);",
            f"        {needs['private_channel_var']} = privChan;",
            f"        const {{user: privUser}} = await User.apiCreateUser(siteOneUrl, {{prefix: '{needs['private_user_prefix']}'}});",
            "        if (!privUser?.id) {",
            "            throw new Error('[beforeAll] Failed to create private-channel user');",
            "        }",
            "        await Team.apiAddUserToTeam(siteOneUrl, privUser.id, testTeam.id);",
        ]
        if needs.get("private_user_in_channel"):
            setup_lines.append(
                "        await Channel.apiAddUserToChannel(siteOneUrl, privUser.id, privChan.id);"
            )
        setup_lines.append(f"        {needs['private_user_var']} = privUser;")

    if needs.get("team_user_var"):
        decls.append(f"    let {needs['team_user_var']}: any;")
        setup_lines += [
            f"        const {{user: teamUser}} = await User.apiCreateUser(siteOneUrl, {{prefix: '{needs['team_user_prefix']}'}});",
            "        if (!teamUser?.id) {",
            "            throw new Error('[beforeAll] Failed to create team user');",
            "        }",
            "        await Team.apiAddUserToTeam(siteOneUrl, teamUser.id, testTeam.id);",
        ]
        if needs.get("team_user_in_channel"):
            setup_lines.append(
                "        await Channel.apiAddUserToChannel(siteOneUrl, teamUser.id, testChannel.id);"
            )
        setup_lines.append(f"        {needs['team_user_var']} = teamUser;")

    if needs.get("gm_users"):
        decls += ["    let gmUser1: any;", "    let gmUser2: any;"]
        setup_lines += [
            "        const {user: gmUserOne} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser1'});",
            "        if (!gmUserOne?.id) {",
            "            throw new Error('[beforeAll] Failed to create gmUser1');",
            "        }",
            "        const {user: gmUserTwo} = await User.apiCreateUser(siteOneUrl, {prefix: 'gmuser2'});",
            "        if (!gmUserTwo?.id) {",
            "            throw new Error('[beforeAll] Failed to create gmUser2');",
            "        }",
            "        await Team.apiAddUserToTeam(siteOneUrl, gmUserOne.id, testTeam.id);",
            "        await Team.apiAddUserToTeam(siteOneUrl, gmUserTwo.id, testTeam.id);",
            "        gmUser1 = gmUserOne;",
            "        gmUser2 = gmUserTwo;",
        ]

    setup_lines += [
        "        await ServerScreen.connectToServer(serverOneUrl, serverOneDisplayName);",
        "        await LoginScreen.login(testUser);",
    ]

    # Replace let decls between describe opening and beforeAll/tapMembers/const
    # Find the block of lets after serverOneDisplayName
    m = re.search(
        r"(    const serverOneDisplayName = 'Server 1';\n\n)(?:    //.*\n|    let .*\n)+",
        text,
    )
    if not m:
        print(f"  WARN: could not find decls in {path.name}")
        return False
    text2 = text[: m.end(1)] + "\n".join(decls) + "\n\n" + text[m.end() :]

    new_before_all = (
        "    beforeAll(async () => {\n"
        + "\n".join(setup_lines)
        + "\n    });\n"
    )
    text3, n = re.subn(
        r"    beforeAll\(async \(\) => \{.*?\n    \}\);",
        new_before_all,
        text2,
        count=1,
        flags=re.S,
    )
    if n != 1:
        print(f"  WARN: beforeAll replace failed for {path.name}")
        return False

    # For remove_user: wait for manage screen before tap
    if path.name == "remove_user_private_channel.e2e.ts":
        text3 = text3.replace(
            "        await ManageChannelMembersScreen.manageButton.tap({x: 1, y: 1});",
            "        await ManageChannelMembersScreen.toBeVisible();\n"
            "        await waitFor(ManageChannelMembersScreen.manageButton).toBeVisible().withTimeout(timeouts.TEN_SEC);\n"
            "        await ManageChannelMembersScreen.manageButton.tap({x: 1, y: 1});",
        )

    if text3 != text:
        path.write_text(text3)
        return True
    return False


def main() -> None:
    changed = []
    for name, needs in BOOKMARK_NEEDS.items():
        path = BOOKMARK_DIR / name
        if not path.exists():
            print(f"missing {path}")
            continue
        if slim_bookmark_file(path, needs):
            changed.append(str(path.relative_to(ROOT)))
            print(f"slimmed bookmark {name}")
        else:
            print(f"unchanged bookmark {name}")

    for name, needs in MEMBERS_NEEDS.items():
        path = MEMBERS_DIR / name
        if not path.exists():
            print(f"missing {path}")
            continue
        if slim_members_file(path, needs):
            changed.append(str(path.relative_to(ROOT)))
            print(f"slimmed members {name}")
        else:
            print(f"unchanged members {name}")

    print(f"changed={len(changed)}")


if __name__ == "__main__":
    main()
