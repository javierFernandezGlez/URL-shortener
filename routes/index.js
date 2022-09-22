const router = require("express").Router();
const passport = require('passport');
const crypto = require('crypto');
const async = require('async');
const nodemailer = require('nodemailer');
const flash = require("connect-flash");
const ShortUrl = require('../models/shortUrl.js')
const shortId = require('shortid');

const User = require('../models/user.model');
const shortUrl = require("../models/shortUrl.js");

function isAuthenticatedUser(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please login first to access this page');
    res.redirect("/login");
}

router.get("/login", (req, res, next) => {
    res.render("login");
});
router.get("/", (req, res, next) => {
    res.redirect("/login");
})

router.get("/signup", (req, res, next) => {
    res.render("signup");
});

router.get("/dashboard", isAuthenticatedUser, (req, res, next) => {
    User.findOne({name: req.user.name})
        .populate('urls')
        .then(result => {
            result.urls.sort((a,b) => b.clicks - a.clicks);
            const totalClicks = result.urls.reduce((acc, curr) => {
                return acc + curr.clicks;
            }, 0);
            res.render("dashboard", {shortUrls: result.urls, totalClicks});
        })
        .catch(err => {
            console.log(err);
        })
})


router.get("/logout", (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err); 
        }
    });
    req.flash('success_msg', 'You have been logged out.');
    res.redirect("/login");
})

router.get("/forgot", (req,res,next) => {
    res.render("forgot");
})

router.get('/password/change', isAuthenticatedUser, (req, res)=> {
    res.render('changepassword');
});

router.get('/reset/:token', isAuthenticatedUser,  (req, res) => {
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}})
        .then(user => {
            if(!user) {
                req.flash('error_msg', 'Password reset token is invalid');
                res.redirect('/forgot');
            }

            res.render('newpassword', {token: req.params.token});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/forgot');
        });
});

router.get("/:shortUrl", (req, res, next) => {
    shortUrl.findOne({short: req.params.shortUrl})
        .then(url => {
            if(!url) {
                return res.sendStatus(404);
            }
            url.clicks++;
            url.save();
            res.redirect(url.long);
        })
        .catch(err => {
            console.log(err);
        })
})

router.get("/details", (req,res,next) => {
    res.render("details");
})









router.post('/login', passport.authenticate('local', {
    successRedirect : '/dashboard',
    failureRedirect : '/login',
    failureFlash: 'Invalid email or password. Try Again!!!'
}))

router.post('/signup', (req, res)=> {
    const {name, email, password} = req.body;

    const userData = {
        name : name,
        email :email
    };

    User.register(userData, password, (err, user)=> {
        if(err) {
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/signup');
        }
        passport.authenticate('local') (req, res, ()=> {
            req.flash('success_msg', 'Account created successfully');
            res.redirect('/login');
        });
    });

});


router.post('/forgot', (req, res, next) => {
    let recoveryPassword = '';

    async.waterfall([
        (done) => {
            crypto.randomBytes(30, (err, buf) => {
                let token = buf.toString('hex');
                done(err, token);
            })
        },
        (token, done) => {
            User.findOne({email: req.body.email})
                .then(user => {
                    if(user === null) {
                        req.flash('error_msg', 'No user with this email');
                        return res.redirect('/forgot');
                    }
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; //1 hour

                    user.save(err => {
                        done(err, token, user);
                    })
                })
                .catch(err => {
                    req.flash('error_msg', 'ERROR '+err);
                    res.redirect("/forgot");
                })
        },
        (token, user) => {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user : process.env.GMAIL_EMAIL,
                    pass : process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to: user.email,
                from: 'Javier Fernandez sympaticoJavi@gmail.com',
                subject: 'Recovery Email from this Project',
                text: 'Please click the following link to recover your password: \n\n'+
                        'http://' + req.headers.host + '/reset/' + token + '\n\n'
            };
            smtpTransport.sendMail(mailOptions, err => {
                req.flash('success_msg', 'Email sent. Follow the instructions');
                res.redirect("/forgot");
            })
        }
    ], err => {
        if(err) {
            res.redirect('/forgot');
        }
    })
})

router.post('/reset/:token', (req, res, next) => {
    async.waterfall([
        (done) => {
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}})
                .then(user => {
                    if(!user) {
                        req.flash('error_msg', 'Password reset token is invalid');
                        res.redirect('/forgot');
                    }
                    if(req.body.password !== req.body.confirmpassword) {
                        req.flash('error_msg', "Passwords don't match");
                        return res.redirect('/forgot');
                    }
                    user.setPassword(req.body.password, err => {//we make sure this token is only valid for this time
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(err => {
                            req.logIn(user, err => {
                                done(err, user);
                            })
                        });
                    });
                })
                .catch(err => {
                    req.flash('error_msg', 'ERROR '+err);
                    res.redirect('/forgot');
                })
        },
        (user) => {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user : process.env.GMAIL_EMAIL,
                    pass : process.env.GMAIL_PASSWORD
                }
            });

            let mailOptions = {
                to: user.email,
                from: 'Javier Fernandez sympaticoJavi@gmail.com',
                subject: 'Your password has been updated',
                text: 'Hello, ' + user.name + '\n\n'+
                        'Your password has been updated successfully'
            };
            smtpTransport.sendMail(mailOptions, err => {
                req.flash('success_msg', 'Email sent. Your password has been updated');
                res.redirect("/login");
            })
        }
    ], err => {
        res.redirect('/login');
    });
});

router.post('/password/change', (req, res, next) => {
    //If passwords don't match, then the user has a typo
    if(req.body.password !== req.body.confirmpassword) {
        req.flash('error_msg', "Passwords don't match. Fix this.")
        return res.redirect('/password/change');
    }

    //we find the user that's trying to change the password and set the new password
    User.findOne({email: req.user.email})
        .then(user => {
            user.setPassword(req.body.password, err => {
                user.save()
                    .then(user => {
                        req.flash('success_msg', "Password changed successfully. Login with your new password");
                        res.redirect('/login');
                    })
                    .catch(err => {
                        req.flash('error_msg', 'ERROR: '+err);
                        res.redirect('/password/change');
                    })
            })
        })
})

router.post("/shortUrls", isAuthenticatedUser, (req, res, next) => {
    const newShort = shortId.generate();
    const date = new Date();
    ShortUrl.create({
        long: req.body.fullUrl,
        short: newShort,
        dateCreated: date.toDateString()
    })
            .then(url => {
                User.findByIdAndUpdate(req.user._id, { $push: { "urls": url._id } })
                    .then(result => {
                        res.redirect("/dashboard");
                    })
                    .catch(err => {
                        console.log(err);
                    })
            })
            .catch(err => {
                console.log(err);
            })

}
            
)

router.post("/delete/:id", (req, res, next) => {
    const thisId = req.params.id;
    console.log(thisId);
    User.findByIdAndUpdate(req.user._id, { $pull: { "urls": thisId } })
        .then(result => {
            console.log(result);
            res.redirect("/dashboard");
        })
        .catch(err => {
            console.log(err);
        })
    
})


module.exports = router;