# -*- encoding: utf-8 -*-
# stub: fuzzy_match 2.0.4 ruby lib

Gem::Specification.new do |s|
  s.name = "fuzzy_match".freeze
  s.version = "2.0.4"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Seamus Abshere".freeze]
  s.date = "2013-09-19"
  s.description = "Find a needle in a haystack using string similarity and (optionally) regexp rules. Replaces loose_tight_dictionary.".freeze
  s.email = ["seamus@abshere.net".freeze]
  s.executables = ["fuzzy_match".freeze]
  s.files = ["bin/fuzzy_match".freeze]
  s.homepage = "https://github.com/seamusabshere/fuzzy_match".freeze
  s.rubygems_version = "3.4.1".freeze
  s.summary = "Find a needle in a haystack using string similarity and (optionally) regexp rules. Replaces loose_tight_dictionary.".freeze

  s.installed_by_version = "3.4.1" if s.respond_to? :installed_by_version

  s.specification_version = 3

  s.add_development_dependency(%q<active_record_inline_schema>.freeze, [">= 0.4.0"])
  s.add_development_dependency(%q<pry>.freeze, [">= 0"])
  s.add_development_dependency(%q<rspec-core>.freeze, [">= 0"])
  s.add_development_dependency(%q<rspec-expectations>.freeze, [">= 0"])
  s.add_development_dependency(%q<rspec-mocks>.freeze, [">= 0"])
  s.add_development_dependency(%q<activerecord>.freeze, [">= 3"])
  s.add_development_dependency(%q<mysql2>.freeze, [">= 0"])
  s.add_development_dependency(%q<cohort_analysis>.freeze, [">= 0"])
  s.add_development_dependency(%q<weighted_average>.freeze, [">= 0"])
  s.add_development_dependency(%q<yard>.freeze, [">= 0"])
  s.add_development_dependency(%q<amatch>.freeze, [">= 0"])
end
