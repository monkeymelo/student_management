function requireAuth(req, res, next) {
  if (req.path === '/auth/login') {
    return next();
  }

  if (req.session?.isAuthenticated) {
    return next();
  }

  return res.status(401).json({
    code: 'UNAUTHORIZED',
    message: '请先登录'
  });
}

module.exports = {
  requireAuth
};
