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
                    params: {
                        'build.id': {
                            required: true
                        }
                    },
                    action: jobs
                },
                post: {
                    action: function(){}
                }
            }
        }
    }
);

var getBuilds = genify(({user,repo}, callback)=>travis.repos(user, repo).builds.get(callback));

function *builds() {
    var {builds, commits} = yield getBuilds(this.passport.user.config);
    let commitMap = _.indexBy(commits, 'id');
    this.body = {
        builds: _.map(builds, b => {
            var commit = commitMap[b.commit_id];
            return {
                id: b.id,
                started: b.started_at,
                finished: b.finished_at,
                duration: b.duration,
                sha: commit.sha,
                pullRequest: commit.pull_request_number,
                branch: commit.branch,
                status: b.state
            };
        })
    };
}

function *jobs() {
    let buildId = this.params['build.id'];
}