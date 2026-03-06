const { PgRepository } = require('./pg_repository');

const repository = new PgRepository();

module.exports = {
  repository
};
