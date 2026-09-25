export function environmentMiddleware(registry) {
  return (req, res, next) => {
    try {
      const lease = registry.acquire(req.session.environmentId);
      if (req.session.environmentId !== lease.id) delete req.session.userId;
      req.session.environmentId = lease.id;
      req.db = lease.db;
      res.once('finish', lease.release);
      res.once('close', lease.release);
      next();
    } catch (error) { next(error); }
  };
}
