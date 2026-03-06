const { execFileSync } = require('child_process');

function verifyBcryptPassword(password, hash) {
  if (typeof password !== 'string' || typeof hash !== 'string' || !hash.startsWith('$2')) {
    return false;
  }

  try {
    const output = execFileSync('python3', [
      '-c',
      'import crypt,sys;print("1" if crypt.crypt(sys.argv[1], sys.argv[2]) == sys.argv[2] else "0")',
      password,
      hash
    ], { encoding: 'utf8' }).trim();
    return output === '1';
  } catch (error) {
    return false;
  }
}

module.exports = {
  verifyBcryptPassword
};
