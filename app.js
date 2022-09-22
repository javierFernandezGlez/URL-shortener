const express = require("express");
const app = express();

const path = require("path");
const bodyParser = require("body-parser");
require("dotenv/config");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const session = require("express-session");
const hbs = require('hbs');
hbs.registerPartials(__dirname + '/views/partials');
//dotenv.config({path: '/env'});
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const ShortUrl = require('./models/shortUrl')
const morgan = require("morgan");
const MongoStore = require("connect-mongo");

const User = require('./models/user.model');

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(x => console.log('connected to mongodb ', x.connections[0].name));
app.use(morgan("dev"));

app.use((req,res,next) => {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
})

app.use(session({
    secret: "el cafecito y el batido de mamey",
    resave: true,
    saveUninitialized: true,
    cookie: {
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 10000000000
      }, // ADDED code below !!!
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI
 
        // ttl => time to live
        // ttl: 60 * 60 * 24 // 60sec * 60min * 24h => 1 day
      })
}));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({usernameField : 'email'}, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(flash());

app.use((req, res, next) => {
    res.locals.success_msg = req.flash(("success_msg"));
    res.locals.error_msg = req.flash(("error_msg"));
    res.locals.error = req.flash(('error'));
    res.locals.currentUser = req.user;
    next();
});

app.use(bodyParser.urlencoded({extended:true}));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
hbs.registerPartials(__dirname + '/views/partials');

const index = require('./routes/index');
app.use('/', index);

app.listen(3000, () => {
    console.log("Server is running");
})