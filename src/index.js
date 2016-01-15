'use strict';

var Travis = require('travis-ci');

var genify = require('thunkify-wrap').genify;
var _ = require('lodash');

var travis = new Travis({
    version: '2.0.0'
});

var bootstrap = require('buildboard-tool-bootstrap').bootstrap;

bootstrap(
    {
        id: 'travis',
        settings: {
            user: {
                caption: 'Github user',
                type: 'string'
            },
            repo: {
                caption: 'Github repo',
                type: 'string'
            }
        },
        methods: {
            builds: {
                get: {
                    action: builds
                }
            },
            jobs: {
                get: {
                    action: jobs
                }
            },
            artifacts: {
                get: {
                    action: function(){}
                }
            }
        }
    }
);

var getBuilds = genify(({user,repo}, callback)=>travis.repos(user, repo).builds.get(callback));

function *builds() {
    let config = this.passport.user.config;
    var {builds, commits} = yield getBuilds(config);
    let commitMap = _.indexBy(commits, 'id');
    this.body = {
        items: _.map(builds, b => {
            var commit = commitMap[b.commit_id];
            return {
                id: b.id,
                name: `${commit.branch}_${b.number}`,
                timestamp: b.started_at,
                duration: b.duration,
                commit: commit.sha,
                number: b.number,
                url: `https://travis-ci.org/${config.user}/${config.repo}/builds/${b.id}`,
                pullRequest: commit.pull_request_number,
                branch: commit.branch,
                status: b.state,
                config: {}
            };
        })
    };
}

function *jobs() {
}