# node-locust

## Links

- Locust Website: locust.io
- Locust Documentation: docs.locust.io

## Description

`node-locust` is a load generator for locust written in JavaScript

## Usage:

```
# Start locust master
locust --master \
       --master-bind-port 5557 \
       --host <test-server> \
       --locustfile ./locust-node/dummy.py

# Start node client
node-locust --locustfile ./examples/basic.js \
            --master-host 127.0.0.1
            --master-port 5557
```

## Locust file:

```javascript
const { Locust, TaskSet, HTTPClient } = require('node-locust');

class UserTasks extends TaskSet {
  constructor() {
    super();

    this.http = new HTTPClient({
      baseURL: <test-server>,
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

  async getUserInfo() {
    await this.http.request({
      method: 'GET',
      url: '/users/1'
    });
  }

  async updateUserInfo() {
    await this.http.request({
      method: 'PUT',
      url: '/users/1',
      body: {
        name: 'user-name'
      }
    });
  }
}

class MyLocust extends Locust {
  constructor() {
    super();

    this.taskSet = new MyTaskSet();
  }
}

module.exports = { MyLocust };
```

## License

Open source licensed under the MIT license (see LICENSE file for details).
