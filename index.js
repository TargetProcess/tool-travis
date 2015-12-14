'use strict';

var Travis = require('travis-ci');

var genify = require('thunkify-wrap').genify;
var _ = require('lodash');

var travis = new Travis({
    version: '2.0.0'
});


var bootstrap = require('tool-bootstrap').bootstrap;

bootstrap(
    {
        mongo: {
            port: process.env.MONGO_PORT || 3001,
            db: 'buildtool-travis'
        },
        port: process.env.TRAVIS_PORT || 3335,
        settings: {
            'user': {
                caption: 'Github user',
                type: 'string'
            },
            'repo': {
                caption: 'Github repo',
                type: 'string'
            }
        },
        methods: {
            '/builds': {
                get: {
                    action: builds
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
        builds: _.map(builds, b=> {
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