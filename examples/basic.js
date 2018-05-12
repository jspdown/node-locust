const chance = require('chance')();

const { Locust, TaskSet } = require('../locust');
const { HTTPClient } = require('../clients/http');
const logger = require('../logger');

const config = {
  host: process.env.API_HOST,
  port: process.env.API_PORT
};

if (!config.host || !config.port) {
  logger.error('Env variable required: API_HOST, API_PORT');
}


class UserTasks extends TaskSet {
  constructor() {
    super();

    this.http = new HTTPClient({
      baseURL: `${config.host}:${config.port}`,
      timeout: 2000
    },  this.recordSuccess.bind(this),
        this.recordFailure.bind(this));

    this.tasks = [{
      task: () => this.getUserInfo(),
      weight: 2
    }, {
      task: () => this.updateUserInfo(),
      weight: 1
    }];
  }


  async before() { return this.createUser(); }
  async after() { return this.deleteUser(); }


  async createUser() {
    const res = await this.http.request({
      method: 'POST',
      url: '/users',
      body: {
        email: chance.email(),
        name: chance.name()
      }
    });

    this.userId = res.data.id;
    this.userId = 1;
  }


  async deleteUser() {
    await this.http.request({
      method: 'DELETE',
      url: `/users/${this.userId}`
    });

    this.userId = null;
  }


  async getUserInfo() {
    await this.http.request({
      method: 'GET',
      url: `/users/${this.userId}`
    });
  }


  async updateUserInfo() {
    await this.http.request({
      method: 'PUT',
      url: `/users/${this.userId}`,
      body: {
        name: chance.name()
      }
    });
  }
}


class WebsiteUser extends Locust {
  constructor() {
    super();

    this.taskSet = new UserTasks();
  }
}

module.exports = { WebsiteUser };
