const  express = require("express")
const connection = require('./db-config')
const bcrypt = require('bcrypt')
const session = require ('express-session')







const app =express()

app.use(session({
    secret:'liveyours',
    resave:true,
    saveUninitialized:false
}))

app.set('view engine','ejs')

app.use(express.static('public'))

app.use(express.urlencoded( { extended: false }))

// continually check is user is logged in
app.use((req, res, next) => {
    if (req.session.userID === undefined) {
        res.locals.isLoggedIn = false
        res.locals.username = 'Guest'
    } else {
        res.locals.isLoggedIn = true
        res.locals.username = req.session.username
    }
    next()
})

app.get('/', (req,res)=>{
    res.render('index')
})

// results
app.get('/results', (req, res) => {
    if (res.locals.isLoggedIn) {
        let sql = 'SELECT * FROM score WHERE y_id_fk = ?'
        connection.query(
            sql, 
            [req.session.userID], 
            (error, results) => {
                let result = results[0]
                connection.query(
                    "SELECT * FROM question", (error,results) => {
                        res.render('results', {results: result, questions: results})
                    }
                )
                
            }
        )
    } else {
        res.redirect('/login')
    }
})

app.get('/resources', (req, res) => {
    if (res.locals.isLoggedIn) {
        res.render('resources')
    } else {
        res.redirect('/login')
    }
})

app.get('/about',(req,res)=>{
    res.render('about')
})

app.get('/login', (req, res) => {
    const user = {
        email: '',
        password: ''
    }
    res.render('login', {error: false, user: user})
})

// process login form
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    let sql = 'SELECT * FROM youths  WHERE email = ?'
    connection.query(
        sql, [user.email], (error, results) => {
            if ( results.length > 0) {
                bcrypt.compare(user.password, results[0].password, (error, passwordMatches) => {
                    if (passwordMatches) {
                        req.session.userID = results[0].y_id
                        req.session.username = results[0].name.split(' ')[0]
                        res.redirect('/')
                    } else {
                        let message = 'Incorrect password.'
                        res.render('login', {error: true, message: message, user: user})
                    }
                })
            } else {
                let message = 'Account does not exist. Please create one.'
                res.render('login', {error: true, message: message, user: user})
            }
        }
    )
})

// display signup page
app.get('/signup', (req, res) => {
    const user = {
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    }
    res.render('signup', {error: false, user: user})
})


// process signup form
app.post('/signup', (req, res) => {
    const user = {
        name: req.body.fullname,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    }

    if (user.password === user.confirmPassword) {
        
        // check if user exists

        let sql = 'SELECT * FROM youths   WHERE email = ?'
        connection.query(
            sql, [user.email], (error, results) => {
                if ( results.length > 0) {
                    let message = 'Account already exists with the email provided.'
                    res.render('signup', {error: true, message: message, user: user})
                } else {
                    bcrypt.hash(user.password, 10, (error, hash) => {
                        let sql = 'INSERT INTO youths  (email, name, password) VALUES (?,?,?)'
                        connection.query(
                            sql,
                            [
                                user.email,
                                user.name, 
                                hash
                            ], 
                            (error, results) => {
                                res.redirect('/login')
                            }
                        )
                    })
                }
            }
        )

    } else {
        let message = 'Password/confirm password mismatch'
        res.render('signup', {error: true, message: message, user: user})
    }
})


//admin login
app.get('/admin/login', (req,res)=> {
    const admin = {
        email: '',
        password:''
    }
    res.render('admin-login',{error: false, admin:admin})
})

app.post('/admin/login', (req,res)=> {
    const admin = {
        email: req.body.adminEmail,
        password:req.body.adminPassword
    }
    if (admin.email === 'admin@test.com') {
        if (admin.password ==='test12345' ) {
            res.redirect('/admin')
        } else {
          let message ='Incorect password' 
          res.render('admin-login', {error: true, message: message, admin:admin}) 
        }
    } else {
        let message ='Unknown email' 
          res.render('admin-login', {error: true, message: message, admin:admin}) 
    }
})

// prevention tips
app.get('/tips', (req, res) => {
    if (res.locals.isLoggedIn) {
        //check if done quiz already
        let sql = 'SELECT * FROM score WHERE y_id_fk = ?'
        connection.query(
            sql, 
            [req.session.userID],
            (error,results) => {
                if (results.length > 0) {
                    res.redirect('/results')
                } else {
                    res.render('tips') 
                }
            }
        )      
    } else {
        res.redirect('/login')
    }
})


app.post('/tips', (req, res) => {
    const choices = []
    const answers = req.body.markingScheme.split(',')

    for(let i = 1; i <= 10; i++){
        let choice = {
            id: i,
            yourAnswer: req.body[`q${i}`],
            correctAnswer: answers[i - 1],
            score: 0
        }
        if (choice.yourAnswer === choice.correctAnswer) {
            choice.score = 1
        }
        choices.push(choice)
    }

    let sql = 'INSERT INTO score (y_id_fk, response, results) VALUES (?,JSON_ARRAY(?),?)'
    connection.query(
        sql, 
        [
            req.session.userID,
            [...choices.map(choice => choice.yourAnswer)],
            choices.map(choice => choice.score).reduce((a,b) => a + b)
        ], 
        (error, results) => {
            res.redirect('/results')
        }
    )
})

app.listen(3000, ()=>{
    console.log('app running jabahouse...')
})

