require('dotenv').config();
const express = require('express');
const app = express();
const cors = require("cors")
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const path = require('path');
const cookieParser = require('cookie-parser');
const request = require('request')

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
    console.log('MongoDB connected')
});

const bcrypt = require('bcrypt');
const saltRounds = 10;

app.use(express.json());
app.use(express.static("./public"))
app.use(cors())
app.use(cookieParser())

app.use(express.static('./dashboard/login'));
app.use(express.static('./dashboard/board'));

app.disable('x-powered-by');


const clientSchema = require('./schemas/client.schema')
const ClientModel = mongoose.model('Client', clientSchema)

const userSchema = require('./schemas/user.schema');
const UserModel = mongoose.model('User', userSchema)


function authToken(req, res, next) {
    // const authToken = req.headers['authorization'];
    const token = req.cookies['access_token'];
    // const token = authToken && authToken.split(' ')[1];
    if (token == null) {
        res.status(401).json({
            status: "error",
        })
    } else {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                res.status(403).json({
                    status: "error",
                })
            } else {
                req.user = user;
                next();
            }
        })
    }

}

function validateClient(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        company: Joi.string(),
        phone: Joi.number().required(),
        city: Joi.string().required(),
        state: Joi.string().required(),
        address: Joi.string().required(),
        budget: Joi.number().required(),
        term: Joi.string().required(),
        message: Joi.string(),
        captcha: Joi.string().required()
    })

    const validateInput = (input) => schema.validate(input);

    const { error } = validateInput(req.body);
    if (error) {
        res.status(400).json({
            status: error.details[0].message,
        })
    } else {
        next();
    }
}


//TODO Uncomment this

// app.post('/newUser', async (req, res) => {
//     bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
//         if (err) {
//             console.log(err)
//         } else {
//             const newUser = new UserModel({
//                 username: req.body.username,
//                 password: hash
//             })

//             newUser.save().then(() => {
//                 res.status(200).json({
//                     status: "success",
//                 })

//             }).catch((err) => {
//                 console.log(err)
//                 res.status(500).json({
//                     status: "error",
//                 })

//             })
//         }
//     })
// })

app.get('/login', async (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dashboard/login/index.html'))
})


app.get('/dashboard', authToken, (req, res) => {
    res.sendFile(path.resolve(__dirname, '../dashboard/board/index.html'))
})


app.post('/logout', (req, res) => {
    res.clearCookie('access_token', { maxAge: 3600000, httpOnly: true })
    res.status(200).json({
        path: '/login/'
    })
})

app.post("/changePass", authToken, async (req, res) => {
    const hashed = await bcrypt.hash(req.body.newPassword, saltRounds);
    await UserModel.findOneAndUpdate({ username: req.body.username }, { password: hashed }).then((data) => {
        res.status(200).json({
            status: "success"
        })
    }).catch((err) => {
        console.log(err);
        res.status(500).json({
            status: "error"
        })
    })
})

app.post('/login', async (req, res) => {
    const user = await UserModel.findOne({ username: req.body.username })
    if (user) {
        bcrypt.compare(req.body.password, user.password, (err, result) => {
            if (err) {
                res.status(500).json({
                    status: "error",
                })
            } else {
                if (result) {
                    const username = req.body.username
                    const user = { name: username }
                    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30m' })
                    res.cookie('access_token', accessToken, { maxAge: 3600000, httpOnly: true })
                    res.status(200).json({
                        path: '/dashboard/'
                    })
                } else {
                    res.status(500).json({
                        status: "error",
                    })

                }
            }
        })
    } else {
        res.status(500).json({
            status: "error",
        })
    }
})

app.post('/getClient', authToken, async (req, res) => {
    await ClientModel.find({ name: req.body.query }).then((data) => {
        res.status(200).json({
            status: "success",
            data: data
        })
    })
})

app.get('/getAllClients', authToken, async (req, res) => {
    await ClientModel.find().then((data) => {
        res.status(200).json({
            status: "success",
            data: data
        })
    })
})

app.delete('/deleteClient/:clientName', authToken, async (req, res) => {
    let clientName = req.params.clientName
    await ClientModel.deleteOne({ name: clientName }).then((data) => {
        res.status(200).json({
            status: "success",
            data: data
        })
    }).catch((err) => {
        res.status(500).json({
            status: "error",
        })
    })
})

app.delete('/clearDatabase', authToken, async (req, res) => {
    await ClientModel.deleteMany({}).then((data) => {
        res.status(200).json({
            status: 'success'
        })
    }).catch((err) => {
        res.status(500).json({
            status: 'error'
        })
    })
})


app.post("/newClient", validateClient, async (req, response) => {
    const secretKey = process.env.RECAPTCHA_SECRET

    const verifyUrl = `https://google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${req.body.captcha}&remoteip=${req.connection.remoteAddress}`

    let captchaPassed = false

    request(verifyUrl, (err, res, body) => {
        console.log(body);
        if (body.success == false) {
            return response.status(401).json({
                msg: 'Failed'
            })
        } else {
            try {
                const newClient = new ClientModel(req.body);
                newClient.save().then(() => {
                    return response.status(200).json({
                        status: "success",
                    })
                }).catch((err) => {
                    console.log(err);
                })
            } catch (err) {
                return response.status(500).json({
                    status: "error",
                })
            }
        }


    })


})


//TODO (Optional) Blacklist

// function authToken(req, res, next) {
//     const authToken = req.headers['authorization'];
//     const token = authToken && authToken.split(' ')[1];
//     if (token == null) {
//         res.status(401).json({
//             status: "error",
//         })
//     } else {
//         BlackListModel.find({}).then((blacklistTokens, err) => {
//             if (err) {
//                 console.log(err);
//                 res.status(403).json({
//                     status: "error",
//                 })
//             } else {
//                 if (blacklistTokens && blacklistTokens.length) {
//                     let bcryptToken;
//                     for (const blacklistToken of blacklistTokens) {
//                         bcryptToken = bcrypt.compare(token, blacklistToken.token);
//                     }
//                     console.log(bcryptToken);
//                     if(!bcryptToken) {
//                         jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//                             if (err) {
//                                 res.status(403).json({
//                                     status: "error",
//                                 })
//                             } else {
//                                 req.user = user;
//                                 next();
//                             }
//                         })
//                     }else{
//                         res.status(403).json({
//                             status: "Forbidden",
//                         })
//                     }
//                 } else {
//                     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//                         if (err) {
//                             res.status(403).json({
//                                 status: "error",
//                             })
//                         } else {
//                             req.user = user;
//                             next();
//                         }
//                     })
//                 }
//             }
//         })
//     }

// }

module.exports = app;
