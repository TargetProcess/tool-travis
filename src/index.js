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
                    action: artifacts
                }
            }
        }
    },
    ({router, generalSettings})=> {
        router.post('/webhook', function *() {
            let payload = this.request.body.payload;
            let build = {
                id: payload.id,
                name: `${payload.branch}_${payload.number}`,
                timestamp: payload.started_at,
                commit: payload.commit,
                number: payload.number,
                url: payload.build_url,
                branch: payload.branch,
                status: payload.status_message,
                config: {},
                initiator: payload.commiter_name,
                pullRequest: payload.type === 'pull_request' ? payload.pull_request_number : null
            };

            let buildRequestOptions = {
                url: generalSettings.buildboardUrl + '/api/builds/' + this.passport.user.toolToken,
                method: 'post',
                json: build
            };

            yield request(buildRequestOptions);

            let jobs = payload.matrix.map(j => {
                return {
                    id: j.id,
                    name: `${j.branch}_${j.number}`,
                    url: `https://travis-ci.org/${payload.repository.owner_name}/${payload.repository.name}/jobs/${j.id}`,
                    number: j.number,
                    build: build.id,
                    timestamp: j.started_at,
                    config: {},
                    status:j.status
                };
            });

            let jobRequestOptions = {
                url: generalSettings.buildboardUrl + '/api/jobs/' + this.passport.user.toolToken,
                method: 'post',
                json: {
                    items: jobs
                }
            };
            yield request(jobRequestOptions);

            this.body = {ok: true};
            this.status = 200;

        });
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

function *artifacts() {
    this.body = {
        items: yield getArtifacts(this.passport.user.config)
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
    });
}

function *getArtifacts(config) {
    let {builds} = yield getBuildsFromTravis(config);
    let jobIds = _.flatten(builds.map(b => b.job_ids));

    return jobIds.map(id => {
        let url = `https://api.travis-ci.org/jobs/${id}/log.txt`;
        return {
            id: url,
            name: 'output',
            job: id,
            url: url
        };
    });
}
