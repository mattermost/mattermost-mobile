module Fastlane
  module Actions
    class AndroidCommitVersionBumpAction < Action
      def self.run(params)
        require 'xcodeproj'
        require 'pathname'
        require 'set'
        require 'shellwords'

        app_folder_name ||= params[:app_folder_name]
        UI.message("The commit_android_version_bump plugin is looking inside your project folder (#{app_folder_name})!")

        build_folder_paths = Dir[File.expand_path(File.join('**/',app_folder_name))].reject { |file| file.include?('build/') || file.include?('node_modules')}
        # no build.gradle found: error
        UI.user_error!('Could not find a build folder in the current repository\'s working directory.') if build_folder_paths.count == 0

        UI.message("Found the following project path: #{build_folder_paths}")
        # too many projects found: error
        if build_folder_paths.count > 1
          UI.user_error!("Found multiple build.gradle projects in the current repository's working directory.")
        end

        build_folder_path = build_folder_paths.first

        # find the repo root path
        repo_path = Actions.sh("git -C #{build_folder_path} rev-parse --show-toplevel").strip
        repo_pathname = Pathname.new(repo_path)


        build_file_paths = Dir[File.expand_path(File.join('**/',app_folder_name,'build.gradle'))].reject { |file| file.include?('build/') || file.include?('node_modules')}

        # no build.gradle found: error
        UI.user_error!('Could not find a build.gradle in the current repository\'s working directory.') if build_file_paths.count == 0
        # too many projects found: error
        if build_file_paths.count > 1
          UI.user_error!("Found multiple build.gradle projects in the current repository's working directory.")
        end

        build_file_path = build_file_paths.first
        build_file_path.replace build_file_path.sub("#{repo_pathname}/", "")

        # create our list of files that we expect to have changed, they should all be relative to the project root, which should be equal to the git workdir root
        expected_changed_files = []
        expected_changed_files << build_file_path

        # get the list of files that have actually changed in our git workdir
        git_dirty_files = Actions.sh("git -C #{repo_path} diff --name-only HEAD").split("\n") + Actions.sh("git -C #{repo_path} ls-files --other --exclude-standard").split("\n")

        # little user hint
        UI.user_error!("No file changes picked up. Make sure you run the `increment_version_code` action first.") if git_dirty_files.empty?

        # check if the files changed are the ones we expected to change (these should be only the files that have version info in them)
        changed_files_as_expected = (Set.new(git_dirty_files.map(&:downcase)).subset? Set.new(expected_changed_files.map(&:downcase)))

        unless changed_files_as_expected
          unless params[:force]
            error = [
                "Found unexpected uncommited changes in the working directory. Expected these files to have ",
                "changed: \n#{expected_changed_files.join("\n")}.\nBut found these actual changes: ",
                "#{git_dirty_files.join("\n")}.\nMake sure you have cleaned up the build artifacts and ",
                "are only left with the changed version files at this stage in your lane, and don't touch the ",
                "working directory while your lane is running. You can also use the :force option to bypass this ",
                "check, and always commit a version bump regardless of the state of the working directory."
            ].join("\n")
            UI.user_error!(error)
          end
        end

        # get the absolute paths to the files
        git_add_paths = expected_changed_files.map do |path|
          updated = path
          updated.replace updated.sub("#{repo_pathname}", "./")#.gsub(repo_pathname, ".")
          puts " -- updated = #{updated}".yellow
          File.expand_path(File.join(repo_pathname, updated))
        end

        # then create a commit with a message
        Actions.sh("git -C #{repo_path} add #{git_add_paths.map(&:shellescape).join(' ')}")

        begin
          version_code = Actions.lane_context["VERSION_CODE"]

          params[:message] ||= (version_code ? "Version Bump to #{version_code}" : "Version Bump")

          Actions.sh("git -C #{repo_path} commit -m '#{params[:message]}'")

          UI.success("Committed \"#{params[:message]}\" 💾.")
        rescue => ex
          UI.error(ex)

          UI.important("Didn't commit any changes.")
        end

      end

      def self.description
        "This Android plugins allow you to commit every modification done in your build.gradle file during the execution of a lane. In fast, it do the same as the commit_version_bump action, but for Android"
      end

      def self.authors
        ["jems"]
      end

      def self.available_options
        [
            FastlaneCore::ConfigItem.new(key: :message,
                                         env_name: "CVB_COMMIT_BUMP_MESSAGE",
                                         description: "The commit message when committing the version bump",
                                         optional: true),
            FastlaneCore::ConfigItem.new(key: :app_folder_name,
                                         env_name: "CVB_APP_VERSION_NAME",
                                         description: "The name of the application source folder in the Android project (default: app)",
                                         optional: true,
                                         type: String,
                                         default_value:"app"),
            FastlaneCore::ConfigItem.new(key: :force,
                                         env_name: "CVB_FORCE_COMMIT",
                                         description: "Forces the commit, even if other files than the ones containing the version number have been modified",
                                         optional: true,
                                         default_value: false,
                                         is_string: false)
        ]
      end

      def self.is_supported?(platform)
        [:android].include?(platform)
        true
      end
    end
  end
end
