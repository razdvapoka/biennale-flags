const { Client } = require("pg");
let client;

const initDBClient = async () => {
  client = new Client();
  await client.connect();
};

const getDBClient = async () => {
  if (client) {
    return client;
  } else {
    await initDBClient();
  }
};

module.exports = {
  initDBClient,
  getDBClient,
};
