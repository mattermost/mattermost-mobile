# rubocop:disable Style/CaseEquality
# rubocop:disable Style/MultilineTernaryOperator
# rubocop:disable Style/NestedTernaryOperator

require 'tempfile'
require 'fileutils'

module Fastlane
  module Actions
    class AndroidIncrementVersionCodeAction < Action
      def self.run(params)
        app_folder_name ||= params[:app_folder_name]
        UI.message("The get_version_code plugin is looking inside your project folder (#{app_folder_name})!")

        version_code = "0"
        new_version_code ||= params[:version_code]
        UI.message("new version code = #{new_version_code}")

        temp_file = Tempfile.new('fastlaneIncrementVersionCode')
        foundVersionCode = "false"
        Dir.glob("#{app_folder_name}/build.gradle") do |path|
          UI.message(" -> Found a build.gradle file at path: (#{path})!")
          begin
            temp_file = Tempfile.new('fastlaneIncrementVersionCode')
            File.open(path, 'r') do |file|
              file.each_line do |line|
                if line.include? "versionCode " and foundVersionCode=="false"

                  versionComponents = line.strip.split(' ')
                  version_code = versionComponents[1].tr("\"","")
                  if new_version_code <= 0
                    new_version_code = version_code.to_i + 1
                  end
                  if !!(version_code =~ /\A[-+]?[0-9]+\z/)
                    line.replace line.sub(version_code, new_version_code.to_s)
                    foundVersionCode = "true"
                  end
                  temp_file.puts line
                else
                  temp_file.puts line
                end
              end

              if foundVersionCode=="true"
                break
              end
              file.close
            end
            temp_file.rewind
            temp_file.close
            FileUtils.mv(temp_file.path, path)
            temp_file.unlink
          ensure
            if foundVersionCode=="true"

              break
            end

          end
        end


        if version_code == "0" || new_version_code == "1"
          UI.user_error!("Impossible to find the version code in the current project folder #{app_folder_name} 😭")
        else
          # Store the version name in the shared hash
          Actions.lane_context["VERSION_CODE"]=new_version_code
          UI.success("☝️ Version code has been changed from #{version_code} to #{new_version_code}")
        end

        return new_version_code
      end

      def self.description
        "Increment the version code of your android project."
      end

      def self.authors
        ["Jérémy TOUDIC"]
      end

      def self.available_options
        [
            FastlaneCore::ConfigItem.new(key: :app_folder_name,
                                         env_name: "INCREMENTVERSIONCODE_APP_FOLDER_NAME",
                                         description: "The name of the application source folder in the Android project (default: app)",
                                         optional: true,
                                         type: String,
                                         default_value:"app"),
            FastlaneCore::ConfigItem.new(key: :version_code,
                                         env_name: "INCREMENTVERSIONCODE_VERSION_CODE",
                                         description: "Change to a specific version (optional)",
                                         optional: true,
                                         type: Integer,
                                         default_value: 0)
        ]
      end

      def self.output
        [
            ['VERSION_CODE', 'The new version code of the project']
        ]
      end

      def self.is_supported?(platform)
        [:android].include?(platform)
      end
    end
  end
end



# rubocop:enable Style/CaseEquality
# rubocop:enable Style/MultilineTernaryOperator
# rubocop:enable Style/NestedTernaryOperator
