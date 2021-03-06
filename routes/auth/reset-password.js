const express = require('express'),
  pwdreset = express.Router(),
  nodemailer = require('nodemailer'),
  User = require('../../models/user'),
  winston = require('winston'),
  authlogger = winston.loggers.get('auth-logger');

let transporter = nodemailer.createTransport({
  service: 'Yandex',
  auth: {
    user: process.env.APP_EMAIL_USR,
    pass: process.env.APP_EMAIL_PWD
  }
});

pwdreset.post('/', (req, res, next) => {       // in case session had staled while page was opened is-authed check will make an error
  let recipient = req.body.recipient,
    findKey = { name: recipient };

  if (recipient.includes('@'))
    findKey = { email: recipient };

  User.findOne(findKey, (err, user) => {
    if (err) return next(new Error('User finding error on reset-password route'));

    if (user === null
        || user.toObject().hash)
      return res.status(401).end();

    let name = user.toObject().name,
      email = user.toObject().email,
      pwd = genPassword(),
      pwdUpdated;

    pwdUpdated = User.updatePassword(name, pwd, next);

    pwdUpdated.then(() => {
      transporter.sendMail({
          from: process.env.APP_EMAIL_USR,
          to: process.env.NODE_ENV === 'development' ? process.env.APP_DEV_EMAIL_RECIPIENT : email,
          subject: 'Your quaint-quotes password update',
          html: '<p>Your new password is below. Remember to change it on profile page after you log in.</p>'
            + '<p style="font-size: 24px; font-weight: 600; color: #276884">' + pwd + '</p>'
        },
        (err, info) => {
          if (err) return next(new Error('Email message was not delivered'));
          authlogger.verbose('message sent', info);
        });
      res.flash('regSuccess', 'New password has been set! Check your e-mail to obtain (it may take a few minutes before message arrived)');
      res.status(200).end();
    });

    function genPassword() {
      let pwd = '';

      while (pwd.length < 20)
        pwd += Math.random().toString(36).slice(2);

      return pwd.slice(0, 19) + '1Sb';
    }
  });
});

module.exports = pwdreset;
