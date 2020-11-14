# rubocop:disable Style/CaseEquality
# rubocop:disable Style/MultilineTernaryOperator
# rubocop:disable Style/NestedTernaryOperator

require 'tempfile'
require 'fileutils'

module Fastlane
  module Actions
    class AndroidUpdateApplicationIdAction < Action
      def self.run(params)
        app_folder_name ||= params[:app_folder_name]
        UI.message("The update_application_id plugin is looking inside your project folder (#{app_folder_name})!")

        new_application_id ||= params[:application_id]
        UI.message("new applicationId = #{new_application_id}")

        temp_file = Tempfile.new('fastlaneUpdateApplicationId')
        foundApplicationId = "false"
        Dir.glob("#{app_folder_name}/build.gradle") do |path|
          UI.message(" -> Found a build.gradle file at path: (#{path})!")
          begin
            temp_file = Tempfile.new('fastlaneUpdateApplicationId')
            File.open(path, 'r') do |file|
              file.each_line do |line|
                if line.include? "applicationId " and foundApplicationId=="false"

                  applicationComponents = line.strip.split(' ')
                  application_id = applicationComponents[1].tr("\"","")
                  line.replace line.sub(application_id, new_application_id.to_s)
                  foundApplicationId = "true"
                  temp_file.puts line
                else
                  temp_file.puts line
                end
              end

              if foundApplicationId=="true"
                break
              end
              file.close
            end
            temp_file.rewind
            temp_file.close
            FileUtils.mv(temp_file.path, path)
            temp_file.unlink
          ensure
            if foundApplicationId=="true"

              break
            end

          end
        end


        if new_application_id.empty?
          UI.user_error!("Impossible to update the applicationId in the current project folder #{app_folder_name} 😭")
        else
          # Store the version name in the shared hash
          Actions.lane_context["ANDROID_APPLICATION_ID"]=new_application_id
          UI.success("☝️ application_id has been changed to #{new_application_id}")
        end

        return new_application_id
      end

      def self.description
        "Update the applicationId of your android project."
      end

      def self.authors
        ["Elias Nahum"]
      end

      def self.available_options
        [
            FastlaneCore::ConfigItem.new(key: :app_folder_name,
                                         env_name: "APPLICATIONID_APP_FOLDER_NAME",
                                         description: "The name of the application source folder in the Android project (default: app)",
                                         optional: true,
                                         type: String,
                                         default_value:"app"),
            FastlaneCore::ConfigItem.new(key: :application_id,
                                         env_name: "APPLICATIONID_VALUE",
                                         description: "Change to a specific applicationId",
                                         optional: false,
                                         type: String,
                                         default_value: '')
        ]
      end

      def self.output
        [
            ['ANDROID_APPLICATION_ID', 'The new applicationId of the project']
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
