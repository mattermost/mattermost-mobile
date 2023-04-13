# rubocop:disable Style/CaseEquality
# rubocop:disable Style/MultilineTernaryOperator
# rubocop:disable Style/NestedTernaryOperator
module Fastlane
  module Notification
    class Mattermost
      def initialize(webhook_url)
        @webhook_url = webhook_url
        @client = Faraday.new do | conn |
          conn.use(Faraday::Response::RaiseError)
        end
      end

      def post_incoming_webhook(channel:, username:, attachments:, icon_url:)
        @client.post(@webhook_url) do | request |
          request.headers['Content-Type'] = 'application/json'
          request.body = {
            channel: channel,
            username: username,
            icon_url: icon_url,
            attachments: attachments
          }.to_json
        end
      end

      class LinkFormatter
        HTML_PATTERN = %r{<a.*?href=['"](?<link>#{URI.regexp})['"].*?>(?<label>.+?)<\/a>}
        MARKDOWN_PATTERN = /\[(?<label>[^\[\]]*?)\]\((?<link>#{URI.regexp}|mailto:#{URI::MailTo::EMAIL_REGEXP})\)/
  
        def self.format(string)
          convert_markdown_to_link(convert_html_to_link(string.scrub))
        end
    
        def self.convert_html_to_link(string)
          string.gsub(HTML_PATTERN) do |match|
            md_link(Regexp.last_match[:link], Regexp.last_match[:label])
          end
        end
    
        def self.convert_markdown_to_link(string)
          string.gsub(MARKDOWN_PATTERN) do |match|
            md_link(Regexp.last_match[:link], Regexp.last_match[:label])
          end
        end
    
        def self.md_link(href, text)
          return "<#{href}>" if text.nil? || text.empty?
          "<#{href}|#{text}>"
        end
  
      end
    end
  end

  module Actions
    class MattermostAction < Action
      class Runner
        def initialize(url)
          @notifier = Fastlane::Notification::Mattermost.new(url)
        end

        def run(options)
          options[:message] = self.class.trim_message(options[:message].to_s || '')
          options[:message] = Fastlane::Notification::Mattermost::LinkFormatter.format(options[:message])

          options[:pretext] = options[:pretext].gsub('\n', "\n") unless options[:pretext].nil?

          if options[:channel].to_s.length > 0
            channel = options[:channel]
            channel = ('#' + channel) unless ['#', '@'].include?(channel[0]) # send message to channel by default
          end

          username = options[:overwrite_webhook_username_and_icon] ? nil : options[:username]

          mattermost_attachment = self.class.generate_mattermost_attachments(options)
          icon_url = options[:overwrite_webhook_username_and_icon] ? nil : options[:icon_url]
          post_message(
            channel: channel,
            username: username,
            attachments: [mattermost_attachment],
            icon_url: icon_url,
            fail_on_error: false,
          )
        end

        def post_message(channel:, username:, attachments:, icon_url:, fail_on_error:)
          @notifier.post_incoming_webhook(
            channel: channel,
            username: username,
            icon_url: icon_url,
            attachments: attachments
          )
          UI.success("Successfully sent Mattermost notification")
          rescue => error
            UI.error("Exception: #{error}")
            message = "Error posting Mattermost message, maybe the integration has no permission to post to this channel? Try removing the channel parameter in your Fastfile."
            if fail_on_error
              UI.user_error!(message)
            else
              UI.error(message)
            end
        end

        def self.generate_mattermost_attachments(options)
          color = (options[:success] ? 'good' : 'danger')
          should_add_payload = ->(payload_name) { options[:default_payloads].nil? || options[:default_payloads].join(" ").include?(payload_name.to_s) }
  
          mattermost_attachment = {
            fallback: options[:message],
            pretext: options[:pretext],
            text: options[:message],
            color: color,
            fields: []
          }
  
          # custom user payloads
          mattermost_attachment[:fields] += options[:payload].map do |k, v|
            {
              title: k.to_s,
              value: Fastlane::Notification::Mattermost::LinkFormatter.format(v.to_s),
              short: false
            }
          end
  
          # Add the lane to the Mattermost message
          # This might be nil, if mattermost is called as "one-off" action
          if should_add_payload[:lane] && Actions.lane_context[Actions::SharedValues::LANE_NAME]
            mattermost_attachment[:fields] << {
              title: 'Lane',
              value: Actions.lane_context[Actions::SharedValues::LANE_NAME],
              short: true
            }
          end
  
          # test_result
          if should_add_payload[:test_result]
            mattermost_attachment[:fields] << {
              title: 'Result',
              value: (options[:success] ? 'Success' : 'Error'),
              short: true
            }
          end
  
          # git branch
          if Actions.git_branch && should_add_payload[:git_branch]
            mattermost_attachment[:fields] << {
              title: 'Git Branch',
              value: Actions.git_branch,
              short: true
            }
          end
  
          # git_author
          if Actions.git_author_email && should_add_payload[:git_author]
            if FastlaneCore::Env.truthy?('FASTLANE_MATTERMOST_HIDE_AUTHOR_ON_SUCCESS') && options[:success]
              # We only show the git author if the build failed
            else
              mattermost_attachment[:fields] << {
                title: 'Git Author',
                value: Actions.git_author_email,
                short: true
              }
            end
          end
  
          # last_git_commit
          if Actions.last_git_commit_message && should_add_payload[:last_git_commit]
            mattermost_attachment[:fields] << {
              title: 'Git Commit',
              value: Actions.last_git_commit_message,
              short: false
            }
          end

          # last_git_commit_hash
          if Actions.last_git_commit_hash(true) && should_add_payload[:last_git_commit_hash]
            mattermost_attachment[:fields] << {
              title: 'Git Commit Hash',
              value: Actions.last_git_commit_hash(short: true),
              short: false
            }
          end
  
          # merge additional properties
          deep_merge(mattermost_attachment, options[:attachment_properties])
        end

        # As there is a text limit in the notifications, we are
        # usually interested in the last part of the message
        # e.g. for tests
        def self.trim_message(message)
          # We want the last 7000 characters, instead of the first 7000, as the error is at the bottom
          start_index = [message.length - 7000, 0].max
          message = message[start_index..-1]
          message.gsub('\n', "\n")
        end
  
        # Adapted from https://stackoverflow.com/a/30225093/158525
        def self.deep_merge(a, b)
          merger = proc do |key, v1, v2|
            Hash === v1 && Hash === v2 ?
                   v1.merge(v2, &merger) : Array === v1 && Array === v2 ?
                     v1 | v2 : [:undefined, nil, :nil].include?(v2) ? v1 : v2
          end
          a.merge(b, &merger)
        end
      end

      def self.is_supported?(platform)
        true
      end

      def self.run(options)
        Runner.new(options[:mattermost_url]).run(options)
      end

      def self.description
        "Send a success/error message to your Mattermost channel"
      end

      def self.available_options
        [
          FastlaneCore::ConfigItem.new(key: :pretext,
                                       env_name: "MATTERMOST_PRETEXT",
                                       description: "An optional line of text that will be shown above the attachment. This supports the standard Mattermost markup language",
                                       optional: true),
          FastlaneCore::ConfigItem.new(key: :message,
                                       env_name: "MATTERMOST_MESSAGE",
                                       description: "The message that should be displayed on Mattermost. This supports the standard Mattermost markup language",
                                       optional: true),
          FastlaneCore::ConfigItem.new(key: :channel,
                                       env_name: "MATTERMOST_CHANNEL",
                                       description: "channel or @username",
                                       optional: true),
          FastlaneCore::ConfigItem.new(key: :overwrite_webhook_username_and_icon,
                                       env_name: "MATTERMOST_USE_WEBHOOK_CONFIGURED_USERNAME_AND_ICON",
                                       description: "Use webook's default username and icon settings? (true/false)",
                                       default_value: false,
                                       is_string: false,
                                       optional: true),
          FastlaneCore::ConfigItem.new(key: :mattermost_url,
                                       env_name: "MATTERMOST_WEBHOOK_URL",
                                       sensitive: true,
                                       description: "Create an Incoming WebHook for your Mattermost channel",
                                       verify_block: proc do |value|
                                         UI.user_error!("Invalid URL, must start with https:// or http://") unless value.start_with? "https://" or value.start_with? "http://"
                                       end),
          FastlaneCore::ConfigItem.new(key: :username,
                                       env_name: "MATTERMOST_USERNAME",
                                       description: "Overrides the webook's username property if overwrite_webhook_username_and_icon is false",
                                       default_value: "Fastlane",
                                       is_string: true,
                                       optional: true),
          FastlaneCore::ConfigItem.new(key: :icon_url,
                                       env_name: "MATTERMOST_ICON_URL",
                                       description: "Overrides the webook's image property if overwrite_webhook_username_and_icon is false",
                                       default_value: "https://s3-eu-west-1.amazonaws.com/fastlane.tools/fastlane.png",
                                       is_string: true,
                                       optional: true),
          FastlaneCore::ConfigItem.new(key: :payload,
                                       env_name: "MATTERMOST_PAYLOAD",
                                       description: "Add additional information to this post. payload must be a hash containg any key with any value",
                                       default_value: {},
                                       is_string: false),
          FastlaneCore::ConfigItem.new(key: :default_payloads,
                                       env_name: "MATTERMOST_DEFAULT_PAYLOADS",
                                       description: "Remove some of the default payloads. More information about the available payloads on GitHub",
                                       optional: true,
                                       is_string: false),
          FastlaneCore::ConfigItem.new(key: :attachment_properties,
                                       env_name: "MATTERMOST_ATTACHMENT_PROPERTIES",
                                       description: "Merge additional properties in the Mattermost attachment, see https://docs.mattermost.com/developer/message-attachments.html",
                                       default_value: {},
                                       is_string: false),
          FastlaneCore::ConfigItem.new(key: :success,
                                       env_name: "MATTERMOST_SUCCESS",
                                       description: "Was this build successful? (true/false)",
                                       optional: true,
                                       default_value: true,
                                       is_string: false)
        ]
      end

      def self.author
        "Mattermost"
      end

      def self.example_code
        [
          'mattermost(message: "App successfully released!")',
          'mattermost(
            message: "App successfully released!",
            channel: "channel",  # Optional, by default will post to the default channel configured for the POST URL.
            success: true,        # Optional, defaults to true.
            payload: {            # Optional, lets you specify any number of your own Mattermost attachments.
              "Build Date" => Time.new.to_s,
              "Built by" => "Jenkins",
            },
            default_payloads: [:git_branch, :git_author], # Optional, lets you specify a whitelist of default payloads to include. Pass an empty array to suppress all the default payloads.
                                                          # Don\'t add this key, or pass nil, if you want all the default payloads. The available default payloads are: `lane`, `test_result`, `git_branch`, `git_author`, `last_git_commit_message`.
            attachment_properties: { # Optional, lets you specify any other properties available for attachments in the Mattermost API (see https://docs.mattermost.com/developer/message-attachments.html).
                                     # This hash is deep merged with the existing properties set using the other properties above. This allows your own fields properties to be appended to the existing fields that were created using the `payload` property for instance.
              thumb_url: "http://example.com/path/to/thumb.png",
              fields: [{
                title: "My Field",
                value: "My Value",
                short: true
              }]
            }
          )'
        ]
      end

      def self.category
        :notifications
      end

      def self.details
        "Create an Incoming WebHook and export this as `MATTERMOST_WEBHOOK_URL`. Can send a message to **channel** (by default), a direct message to **@username** or a message to a private group **group** with success (green) or failure (red) status."
      end
    end
  end
end
# rubocop:enable Style/CaseEquality
# rubocop:enable Style/MultilineTernaryOperator
# rubocop:enable Style/NestedTernaryOperator
