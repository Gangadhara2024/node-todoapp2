const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);

// file import
const { userFormValidate, isEmailValidate } = require("./utils/formUtil");
const userModel = require("./models/userModel");
const isAuth = require("./middlewares/isAuthMiddleware");
const todoDataValidation = require("./utils/todoUtil");
const todoModel = require("./models/todoModel");
require("dotenv").config();
const store = new mongodbSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const PORT = process.env.PORT;
app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Mongodb connected succesfully"))
  .catch((err) => console.log(err));

app.set("view engine", "ejs");

app.get("/registerform", (req, res) => {
  return res.render("registerPage");
});

app.post("/registerform", async (req, res) => {
  console.log(req.body);

  const { name, email, username, password } = req.body;

  try {
    await userFormValidate({ name, email, username, password });
  } catch (error) {
    return res.status(400).json(error);
  }

  try {
    const userEmailExists = await userModel.findOne({ email: email });
    if (userEmailExists) {
      return res.status(400).json("email already exists");
    }

    const usernameExists = await userModel.findOne({ username: username });
    if (usernameExists) {
      return res.status(400).json("username already exists");
    }

    const HashedPassword = await bcrypt.hash(
      password,
      Number(process.env.SALT)
    );

    const userObj = new userModel({
      name: name,
      email: email,
      username: username,
      password: HashedPassword,
    });
    const userDB = await userObj.save();

    return res.redirect("/loginform");
    // return res.status(201).json({
    //   message: "Register succesfull",
    //   data: userDB,
    // });
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.get("/loginform", (req, res) => {
  return res.render("loginPage");
});

app.post("/loginform", async (req, res) => {
  console.log(req.body);
  const { loginId, password } = req.body;

  if (!loginId || !password)
    return res.status(400).json("user credentials missing");

  try {
    let userDb;
    if (isEmailValidate({ key: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }

    if (!userDb) return res.status(400).json("user not found! Register first");

    const matchPassword = await bcrypt.compare(password, userDb.password);
    if (!matchPassword) return res.status(400).json("Incorrect password");

    console.log(req.session);
    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,
      username: userDb.username,
      email: userDb.email,
    };

    if (matchPassword) return res.redirect("/dashboard");
    // if (matchPassword) return res.status(200).json("Login Succesfull");
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.get("/dashboard", isAuth, (req, res) => {
  return res.render("dashboardPage");
});

app.post("/logout", isAuth, (req, res) => {
  console.log(req.session.id);
  req.session.destroy((err) => {
    if (err) return res.status(400).json("login unsuccesfull");
    return res.status(200).json("logout succesfull");
  });
});

app.post("/logoutall", isAuth, async (req, res) => {
  const username = req.session.user.username;

  const sessionSchema = new mongoose.Schema({ _id: String }, { strict: false });
  const sessionModel = mongoose.model("session", sessionSchema);

  try {
    const deleteDb = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    console.log(deleteDb);

    return res.status(200).json("logoutAll sucesfull");
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.post("/createitem", isAuth, async (req, res) => {
  const username = req.session.user.username;
  const todo = req.body.todo;

  try {
    await todoDataValidation({ todo });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }

  const todoobj = new todoModel({
    todo,
    username,
  });

  try {
    const todoDb = await todoobj.save();

    return res.send({
      status: 201,
      message: "Todo created successfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.get("/readitem", isAuth, async (req, res) => {
  const username = req.session.user.username;
  const SKIP = Number(req.query.skip) || 0;
  const LIMIT = 5;

  try {
    // const todoDb = await todoModel.find({ username: username });

    const todoDb = await todoModel.aggregate([
      { $match: { username: username } },
      { $skip: SKIP },
      { $limit: LIMIT },
    ]);

    if (todoDb.length === 0) {
      return res.send({
        status: 204,
        message: "no todo found",
      });
    }

    return res.send({
      status: 200,
      message: "Read success",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.post("/edititem", isAuth, async (req, res) => {
  const { todoId, newData } = req.body;
  const username = req.session.user.username;
  console.log(username);

  try {
    await todoDataValidation({ todo: newData });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }

  try {
    const todoDelete = await todoModel.findOne({ _id: todoId });
    console.log(todoDelete);

    if (username !== todoDelete.username) {
      return res.send({
        status: 403,
        message: "not allowed to edit other todo",
      });
    }

    const todoDb = await todoModel.findOneAndUpdate(
      { _id: todoId },
      { todo: newData },
      { new: true }
    );

    return res.send({
      status: 200,
      message: "todo updated succesfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.post("/deleteitem", isAuth, async (req, res) => {
  const { todoId } = req.body;
  const username = req.session.user.username;
  console.log(todoId, username);

  try {
    const todoDelete = await todoModel.findOne({ _id: todoId });

    if (username !== todoDelete.username) {
      return res.send({
        status: 403,
        message: "dont delete others todo",
      });
    }
    const todoDb = await todoModel.findOneAndDelete({ _id: todoId });
    console.log(todoDb);

    return res.send({
      status: 200,
      message: "delete done",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
});

app.listen(PORT, () => {
  console.log(`server is on http://localhost:${PORT}`);
});
