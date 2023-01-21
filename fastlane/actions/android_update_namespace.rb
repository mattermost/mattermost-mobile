# rubocop:disable Style/CaseEquality
# rubocop:disable Style/MultilineTernaryOperator
# rubocop:disable Style/NestedTernaryOperator

require 'tempfile'
require 'fileutils'

module Fastlane
  module Actions
    class AndroidUpdateNamespaceAction < Action
      def self.run(params)
        app_folder_name ||= params[:app_folder_name]
        UI.message("The update_namespace plugin is looking inside your project folder (#{app_folder_name})!")

        new_namespace ||= params[:namespace]
        UI.message("new namespace = #{new_namespace}")

        temp_file = Tempfile.new('fastlaneUpdateNamespace')
        foundNamespace = "false"
        Dir.glob("#{app_folder_name}/build.gradle") do |path|
          UI.message(" -> Found a build.gradle file at path: (#{path})!")
          begin
            temp_file = Tempfile.new('fastlaneUpdateNamespace')
            File.open(path, 'r') do |file|
              file.each_line do |line|
                if line.include? "namespace " and foundNamespace=="false"

                  applicationComponents = line.strip.split(' ')
                  namespace = applicationComponents[1].tr("\"","")
                  line.replace line.sub(namespace, new_namespace.to_s)
                  foundNamespace = "true"
                  temp_file.puts line
                else
                  temp_file.puts line
                end
              end

              if foundNamespace=="true"
                break
              end
              file.close
            end
            temp_file.rewind
            temp_file.close
            FileUtils.mv(temp_file.path, path)
            temp_file.unlink
          ensure
            if foundNamespace=="true"

              break
            end

          end
        end


        if new_namespace.empty?
          UI.user_error!("Impossible to update the namespace in the current project folder #{app_folder_name} 😭")
        else
          # Store the version name in the shared hash
          Actions.lane_context["ANDROID_NAMESPACE"]=new_namespace
          UI.success("☝️ namespace has been changed to #{new_namespace}")
        end

        return new_namespace
      end

      def self.description
        "Update the namespace of your android project."
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
            FastlaneCore::ConfigItem.new(key: :namespace,
                                         env_name: "NAMESPACE_VALUE",
                                         description: "Change to a specific namespace",
                                         optional: false,
                                         type: String,
                                         default_value: '')
        ]
      end

      def self.output
        [
            ['ANDROID_NAMESPACE', 'The new namespace of the project']
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
