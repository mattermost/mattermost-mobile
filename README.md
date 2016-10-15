# Mattermost Mobile

This project is the Mattermost mobile client from [https://mattermost.org](https://mattermost.org).

It's written in JavaScript using React Native.

##Development

To run this project you will need to setup a `secrets/` directory that will hold a config.json file.  The Mattermost team manages this using git submodules.  You can manage the `secrets/config.json` file manually but if you want to setup the submodules here is what you need:

- First you will need to create a repository that will hold your secrets.  Once you have your repository holding your secrets create a `config.json` file in the root.  Push this up to your git host.  Get the ssh url from your repository, navigate back to this repository and run the following.
- run: `git submodule add -f git@<host>.com:<username>/<repo_name>.git`

This will add the secrets directory and track changes through the git submodule system.  When someone pushes changes to your secrets repository, you can update by running:
- `git submodule foreach git pull origin master`
