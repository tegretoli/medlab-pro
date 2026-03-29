const trajtojGabimin = (gabim, req, res, next) => {
  let statusKod = res.statusCode === 200 ? 500 : res.statusCode;
  let mesazh    = gabim.message;

  // MongoDB: ID i pavlefshëm
  if (gabim.name === 'CastError') {
    statusKod = 404;
    mesazh    = `Resursi me ID '${gabim.value}' nuk u gjet`;
  }
  // MongoDB: Duplikat
  if (gabim.code === 11000) {
    const fushe = Object.keys(gabim.keyValue || {})[0];
    // numrPersonal nuk është unik — injoro këtë gabim specifik
    if (fushe === 'numrPersonal') {
      return res.status(200).json({ sukses: false, mesazh: 'numrPersonal_skip' });
    }
    statusKod = 400;
    mesazh = `Vlera per '${fushe}' egziston tashmë`;
  }
  // Mongoose: Validim
  if (gabim.name === 'ValidationError') {
    statusKod = 400;
    mesazh    = Object.values(gabim.errors).map(e => e.message).join(', ');
  }
  // JWT: I pavlefshëm
  if (gabim.name === 'JsonWebTokenError') {
    statusKod = 401;
    mesazh    = 'Token i pavlefshëm';
  }
  // JWT: Ka skaduar
  if (gabim.name === 'TokenExpiredError') {
    statusKod = 401;
    mesazh    = 'Token-i ka skaduar, hyr perseri';
  }

  res.status(statusKod).json({
    sukses: false,
    mesazh,
    stack: process.env.NODE_ENV === 'development' ? gabim.stack : undefined,
  });
};

module.exports = { trajtojGabimin };
