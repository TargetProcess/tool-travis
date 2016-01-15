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
                    action: function () {
                    }
                }
            }
        }
    }
);

var getBuildsFromTravis = genify(({user,repo}, callback)=>travis.repos(user, repo).builds.get(callback));
var getBuildFromTravis = genify((id, callback)=>travis.builds(id).get(callback));

function *builds() {
    this.body = {
        items: yield getBuilds(this.passport.user.config)
    };
}

function *jobs() {
    this.body = {
        items: yield getJobs(this.passport.user.config)
    };
}

function *getBuilds(config) {
    var {builds, commits} = yield getBuildsFromTravis(config);
    let commitMap = _.indexBy(commits, 'id');

    return _.map(builds, b => {
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
    });
}

function *getJobs(config) {
    let builds = yield getBuilds(config);
    let jobs = _.flatten(yield builds.map(function*(b) {
        let {build, commit, jobs} = yield getBuildFromTravis(b.id);

        return jobs.map(j => {
            return {
                build: build,
                commit: commit,
                job: j
            };
        });
    }));

    return _.map(jobs, ({build, commit, job}) => {
        return {
            id: job.id,
            name: `${commit.branch}_${job.number}`,
            url: `https://travis-ci.org/${config.user}/${config.repo}/jobs/${job.id}`,
            number: job.number,
            build: build.id,
            timestamp: job.started_at,
            config: {},
            status: job.state
        }
    })
}
